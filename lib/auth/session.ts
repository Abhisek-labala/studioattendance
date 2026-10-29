import crypto from 'crypto';
import { cookies } from 'next/headers';
import pool, { query } from '@/db/pool';

const SESSION_COOKIE_NAME = 'studio_gfx_session';
const SESSION_EXPIRATION_DAYS = 7;
const MAX_FAILED_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MINUTES = 15;

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: 'admin' | 'staff';
  staffId?: string;
  staffCode?: string;
  fullName?: string;
  designation?: string;
}

/**
 * Hash raw session token using SHA-256 for secure DB storage
 */
function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Create a new server-side session, persist in database, and set HTTP-only cookie
 */
export async function createSession(
  userId: string,
  ipAddress: string = '',
  userAgent: string = ''
): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRATION_DAYS);

  await query(
    `
    INSERT INTO sessions (user_id, token_hash, expires_at, ip_address, user_agent)
    VALUES ($1, $2, $3, $4, $5);
    `,
    [userId, tokenHash, expiresAt, ipAddress, userAgent]
  );

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });

  return rawToken;
}

/**
 * Validate active session from cookie, returning authenticated user and staff context
 */
export async function getSession(): Promise<AuthenticatedUser | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (!sessionCookie || !sessionCookie.value) {
    return null;
  }

  const tokenHash = hashToken(sessionCookie.value);

  const result = await query(
    `
    SELECT 
      u.id AS "userId",
      u.email,
      u.role,
      u.is_active AS "isActive",
      s.id AS "staffId",
      s.staff_code AS "staffCode",
      s.full_name AS "fullName",
      s.designation,
      sess.expires_at AS "expiresAt"
    FROM sessions sess
    JOIN users u ON u.id = sess.user_id
    LEFT JOIN staff s ON s.user_id = u.id
    WHERE sess.token_hash = $1
    LIMIT 1;
    `,
    [tokenHash]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];

  // If expired or account is deactivated, invalidate session
  if (new Date(row.expiresAt) < new Date() || !row.isActive) {
    await destroySession();
    return null;
  }

  return {
    userId: row.userId,
    email: row.email,
    role: row.role,
    staffId: row.staffId || undefined,
    staffCode: row.staffCode || undefined,
    fullName: row.fullName || undefined,
    designation: row.designation || undefined,
  };
}

/**
 * Destroy active session in database and clear cookie
 */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (sessionCookie && sessionCookie.value) {
    const tokenHash = hashToken(sessionCookie.value);
    await query('DELETE FROM sessions WHERE token_hash = $1;', [tokenHash]);
  }

  cookieStore.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(0),
  });
}

/**
 * Check if an IP has exceeded failed login attempts
 */
export async function checkRateLimit(ipAddress: string): Promise<boolean> {
  const windowTime = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000);

  const result = await query(
    `
    SELECT COUNT(*) as failed_count
    FROM login_attempts
    WHERE ip_address = $1 AND success = false AND attempted_at >= $2;
    `,
    [ipAddress, windowTime]
  );

  const failedCount = parseInt(result.rows[0]?.failed_count || '0', 10);
  return failedCount < MAX_FAILED_ATTEMPTS;
}

/**
 * Record a login attempt for rate limiting and security audits
 */
export async function recordLoginAttempt(
  ipAddress: string,
  email: string,
  success: boolean
): Promise<void> {
  await query(
    `
    INSERT INTO login_attempts (ip_address, email, success)
    VALUES ($1, $2, $3);
    `,
    [ipAddress, email, success]
  );
}

