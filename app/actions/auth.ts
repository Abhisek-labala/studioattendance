'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { query } from '@/db/pool';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import {
  createSession,
  destroySession,
  checkRateLimit,
  recordLoginAttempt,
} from '@/lib/auth/session';
import {
  generateTwoFactorSecret,
  generateOtpAuthUrl,
  generateQrCodeDataUrl,
  verifyTwoFactorToken,
  create2FATicket,
  verify2FATicket,
} from '@/lib/auth/totp';
import { loginSchema, initialSetupSchema } from '@/lib/validation/schemas';
import { logAuditEvent } from '@/lib/audit/logger';

export interface ActionResponse {
  success: boolean;
  error?: string;
  fieldErrors?: { [key: string]: string[] };
  requires2FA?: boolean;
  requires2FASetup?: boolean;
  ticket?: string;
  qrCodeUrl?: string;
  secretKey?: string;
  userEmail?: string;
}

async function getClientIp(): Promise<string> {
  const headerList = await headers();
  const forwardedFor = headerList.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  return headerList.get('x-real-ip') || '127.0.0.1';
}

export async function loginAction(
  _prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  const ip = await getClientIp();

  // Check rate limiting
  const isAllowed = await checkRateLimit(ip);
  if (!isAllowed) {
    return {
      success: false,
      error: 'Too many failed login attempts. Please wait 15 minutes before trying again.',
    };
  }

  const step = formData.get('step')?.toString();

  // =========================================================================
  // STEP 2: Verify Google Authenticator 6-digit Code (TOTP)
  // =========================================================================
  if (step === '2fa') {
    const ticketStr = formData.get('ticket')?.toString() || '';
    const otpCode = formData.get('otpCode')?.toString().trim().replace(/\s+/g, '') || '';
    const preservedQrCodeUrl = formData.get('qrCodeUrl')?.toString() || '';
    const preservedSecretKey = formData.get('secretKey')?.toString() || '';
    const isSetup = formData.get('isSetup')?.toString() === 'true';

    const ticketData = verify2FATicket(ticketStr);
    if (!ticketData) {
      return {
        success: false,
        error: 'Your authentication session expired. Please enter your email and password again.',
      };
    }

    if (!otpCode || otpCode.length !== 6 || !/^\d{6}$/.test(otpCode)) {
      return {
        success: false,
        error: 'Please enter a valid 6-digit verification code from Google Authenticator.',
        requires2FA: !isSetup,
        requires2FASetup: isSetup,
        ticket: ticketStr,
        qrCodeUrl: preservedQrCodeUrl,
        secretKey: preservedSecretKey,
        userEmail: ticketData.email,
      };
    }

    let shouldRedirect = false;

    try {
      const userResult = await query(
        `
        SELECT id, email, role, is_active, two_factor_secret, two_factor_enabled
        FROM users
        WHERE id = $1
        LIMIT 1;
        `,
        [ticketData.userId]
      );

      if (userResult.rows.length === 0 || !userResult.rows[0].is_active) {
        return {
          success: false,
          error: 'Your account is deactivated or no longer exists.',
        };
      }

      const user = userResult.rows[0];

      if (ticketData.setupSecret) {
        // First-time 2FA registration
        const isValid = verifyTwoFactorToken(otpCode, ticketData.setupSecret);
        if (!isValid) {
          return {
            success: false,
            error: 'Invalid 6-digit code. Please verify the code in Google Authenticator and try again.',
            requires2FASetup: true,
            ticket: ticketStr,
            qrCodeUrl: preservedQrCodeUrl,
            secretKey: preservedSecretKey,
            userEmail: ticketData.email,
          };
        }

        // Persist verified secret and enable 2FA
        await query(
          'UPDATE users SET two_factor_secret = $1, two_factor_enabled = true, updated_at = CURRENT_TIMESTAMP WHERE id = $2;',
          [ticketData.setupSecret, user.id]
        );
      } else {
        // Regular 2FA login verification
        if (!user.two_factor_secret) {
          return {
            success: false,
            error: 'Two-factor authentication secret is not configured for this account.',
          };
        }

        const isValid = verifyTwoFactorToken(otpCode, user.two_factor_secret);
        if (!isValid) {
          return {
            success: false,
            error: 'Invalid 6-digit authentication code. Please try again.',
            requires2FA: true,
            ticket: ticketStr,
            userEmail: ticketData.email,
          };
        }
      }

      // Record successful login
      await recordLoginAttempt(ip, ticketData.email, true);

      const headerList = await headers();
      const userAgent = headerList.get('user-agent') || '';

      // Create session & HTTP-only cookie
      await createSession(user.id, ip, userAgent);
      shouldRedirect = true;
    } catch (err: any) {
      console.error('[2FA Login Action Error]:', err);
      return {
        success: false,
        error: 'A server error occurred during two-factor verification. Please try again.',
      };
    }

    if (shouldRedirect) {
      redirect('/dashboard');
    }
  }

  // =========================================================================
  // STEP 1: Verify Email and Password
  // =========================================================================
  const rawData = {
    email: formData.get('email')?.toString().trim() || '',
    password: formData.get('password')?.toString() || '',
  };

  const validation = loginSchema.safeParse(rawData);
  if (!validation.success) {
    return {
      success: false,
      error: 'Please provide a valid email and password.',
      fieldErrors: validation.error.flatten().fieldErrors,
    };
  }

  const { email, password } = validation.data;

  try {
    const userResult = await query(
      `
      SELECT id, email, password_hash, role, is_active, two_factor_secret, two_factor_enabled
      FROM users
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1;
      `,
      [email]
    );

    if (userResult.rows.length === 0) {
      await recordLoginAttempt(ip, email, false);
      return {
        success: false,
        error: 'Invalid email or password.',
      };
    }

    const user = userResult.rows[0];

    if (!user.is_active) {
      await recordLoginAttempt(ip, email, false);
      return {
        success: false,
        error: 'Your account has been deactivated. Please contact the administrator.',
      };
    }

    const isPasswordValid = await verifyPassword(password, user.password_hash);
    if (!isPasswordValid) {
      await recordLoginAttempt(ip, email, false);
      return {
        success: false,
        error: 'Invalid email or password.',
      };
    }

    // Google Authenticator is mandatory for all users
    if (user.two_factor_enabled && user.two_factor_secret) {
      // User has 2FA already configured -> prompt for 6-digit code
      const ticket = create2FATicket({ userId: user.id, email: user.email });
      return {
        success: false,
        requires2FA: true,
        ticket,
        userEmail: user.email,
      };
    } else {
      // First-time setup required -> generate new secret & QR code
      const secret = generateTwoFactorSecret();
      const otpAuthUrl = generateOtpAuthUrl(user.email, secret);
      const qrCodeUrl = await generateQrCodeDataUrl(otpAuthUrl);
      const ticket = create2FATicket({ userId: user.id, email: user.email, setupSecret: secret });

      return {
        success: false,
        requires2FASetup: true,
        ticket,
        qrCodeUrl,
        secretKey: secret,
        userEmail: user.email,
      };
    }
  } catch (err: any) {
    console.error('[Login Action Error]:', err);
    return {
      success: false,
      error: 'A server error occurred during login. Please try again later.',
    };
  }
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect('/login');
}

export async function resetPasswordAction(
  _prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  const email = formData.get('email')?.toString().trim() || '';
  const newPassword = formData.get('newPassword')?.toString() || '';
  const confirmPassword = formData.get('confirmPassword')?.toString() || '';

  if (!email) {
    return { success: false, error: 'Email address is required.' };
  }

  if (!newPassword || newPassword.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters in length.' };
  }

  if (newPassword !== confirmPassword) {
    return { success: false, error: 'New passwords do not match.' };
  }

  try {
    const userResult = await query(
      `
      SELECT id, email, role, is_active
      FROM users
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1;
      `,
      [email]
    );

    if (userResult.rows.length === 0) {
      return {
        success: false,
        error: `No account found for "${email}". Please verify your email address.`,
      };
    }

    const user = userResult.rows[0];

    if (!user.is_active) {
      return {
        success: false,
        error: 'This account has been deactivated. Please contact the administrator.',
      };
    }

    const passwordHash = await hashPassword(newPassword);

    await query(
      `
      UPDATE users
      SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2;
      `,
      [passwordHash, user.id]
    );

    await logAuditEvent({
      actorId: user.id,
      actorEmail: user.email,
      action: 'STAFF_UPDATED',
      entityType: 'users',
      entityId: user.id,
      reason: 'Password updated via Forgot Password reset.',
    });

    return {
      success: true,
    };
  } catch (err: any) {
    console.error('[Reset Password Action Error]:', err);
    return {
      success: false,
      error: 'Failed to reset password: ' + (err.message || 'Unknown error'),
    };
  }
}

export async function initialSetupAction(
  _prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  const ip = await getClientIp();

  try {
    // Verify no admin exists yet
    const userCountResult = await query('SELECT COUNT(*) as count FROM users;');
    const totalUsers = parseInt(userCountResult.rows[0]?.count || '0', 10);

    if (totalUsers > 0) {
      return {
        success: false,
        error: 'Initial setup has already been completed. Please log in.',
      };
    }

    const rawData = {
      fullName: formData.get('fullName')?.toString().trim() || '',
      email: formData.get('email')?.toString().trim() || '',
      password: formData.get('password')?.toString() || '',
      confirmPassword: formData.get('confirmPassword')?.toString() || '',
    };

    const validation = initialSetupSchema.safeParse(rawData);
    if (!validation.success) {
      return {
        success: false,
        error: 'Please fix the errors below.',
        fieldErrors: validation.error.flatten().fieldErrors,
      };
    }

    const { fullName, email, password } = validation.data;
    const passwordHash = await hashPassword(password);

    // Insert initial administrator
    const insertResult = await query(
      `
      INSERT INTO users (email, password_hash, role, is_active)
      VALUES ($1, $2, 'admin', true)
      RETURNING id;
      `,
      [email, passwordHash]
    );

    const adminId = insertResult.rows[0].id;

    // Create staff profile for admin
    await query(
      `
      INSERT INTO staff (user_id, staff_code, full_name, phone, email, designation, joining_date, notes)
      VALUES ($1, 'GFX-ADMIN', $2, '+91 99999 99999', $3, 'Team Leader', CURRENT_DATE, 'Initial Studio Owner / Administrator')
      ON CONFLICT DO NOTHING;
      `,
      [adminId, fullName, email]
    );

    await logAuditEvent({
      actorId: adminId,
      actorEmail: email,
      action: 'STAFF_CREATED',
      entityType: 'admin_setup',
      entityId: adminId,
      reason: 'Initial Studio GFX administrator configured.',
      ipAddress: ip,
    });

    const headerList = await headers();
    const userAgent = headerList.get('user-agent') || '';
    await createSession(adminId, ip, userAgent);
  } catch (err: any) {
    console.error('[Initial Setup Error]:', err);
    return {
      success: false,
      error: 'Failed to complete initial setup: ' + err.message,
    };
  }

  redirect('/dashboard');
}

