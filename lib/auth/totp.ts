import crypto from 'crypto';
import { generateSecret, generateURI, verifySync } from 'otplib';
import QRCode from 'qrcode';

/**
 * Generate a new random base32 TOTP secret for a user
 */
export function generateTwoFactorSecret(): string {
  return generateSecret();
}

/**
 * Generate otpauth:// URL standard for Google Authenticator
 */
export function generateOtpAuthUrl(email: string, secret: string): string {
  return generateURI({
    label: email,
    issuer: 'Studio GFX',
    secret,
  });
}

/**
 * Generate a base64 QR Code image for the user to scan with Google Authenticator
 */
export async function generateQrCodeDataUrl(otpAuthUrl: string): Promise<string> {
  return QRCode.toDataURL(otpAuthUrl, {
    margin: 2,
    width: 220,
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  });
}

/**
 * Verify a 6-digit TOTP token against the user's secret (with 30-second clock tolerance)
 */
export function verifyTwoFactorToken(token: string, secret: string): boolean {
  try {
    const cleanToken = token.trim().replace(/\s+/g, '');
    const result = verifySync({
      token: cleanToken,
      secret,
      epochTolerance: 30, // 30-second window tolerance for clock drift
    });
    return !!result && result.valid === true;
  } catch (err) {
    console.error('Error verifying TOTP token:', err);
    return false;
  }
}

/**
 * Create a signed, tamper-proof temporary token for the 2FA login challenge (valid for 10 minutes)
 */
export function create2FATicket(payload: { userId: string; email: string; setupSecret?: string }): string {
  const secret = process.env.SESSION_SECRET || 'default-studio-gfx-auth-secret-key-32chars';
  const data = {
    ...payload,
    exp: Date.now() + 10 * 60 * 1000, // 10 minutes
  };
  const jsonStr = JSON.stringify(data);
  const base64Data = Buffer.from(jsonStr).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(base64Data).digest('base64url');
  return `${base64Data}.${signature}`;
}

/**
 * Verify and decode the 2FA ticket
 */
export function verify2FATicket(ticket: string): { userId: string; email: string; setupSecret?: string } | null {
  try {
    const parts = ticket.split('.');
    if (parts.length !== 2) return null;
    const [base64Data, signature] = parts;
    const secret = process.env.SESSION_SECRET || 'default-studio-gfx-auth-secret-key-32chars';
    const expectedSignature = crypto.createHmac('sha256', secret).update(base64Data).digest('base64url');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null;
    }

    const jsonStr = Buffer.from(base64Data, 'base64url').toString('utf8');
    const data = JSON.parse(jsonStr);

    if (Date.now() > data.exp) {
      return null; // Expired
    }

    return {
      userId: data.userId,
      email: data.email,
      setupSecret: data.setupSecret,
    };
  } catch (err) {
    return null;
  }
}

