import { createHash, randomBytes } from 'crypto';

/** A high-entropy opaque refresh token — random bytes, not a JWT. */
export function generateRefreshToken(): string {
  return randomBytes(48).toString('base64url');
}

/**
 * SHA-256, not bcrypt: refresh tokens are already high-entropy random
 * values (unlike passwords), so a fast deterministic hash is the correct
 * primitive — bcrypt's deliberate slowness buys nothing here and would
 * make every refresh call artificially expensive.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

const DURATION_UNIT_SECONDS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
};

/** Parses simple durations like '15m', '900s', '1h', '7d' into seconds. */
export function parseDurationToSeconds(value: string): number {
  const match = /^(\d+)(s|m|h|d)$/.exec(value.trim());
  if (!match) {
    throw new Error(`Invalid duration: "${value}"`);
  }
  const [, amount, unit] = match;
  return parseInt(amount, 10) * DURATION_UNIT_SECONDS[unit];
}
