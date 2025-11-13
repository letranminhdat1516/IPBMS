/**
 * Lightweight phone utilities used across the codebase.
 * - sanitizePhoneNumber: strip whitespace and formatting characters
 * - normalizeToE164: best-effort convert common local formats to E.164 (Vietnam default)
 *
 * Note: This is intentionally lightweight. For full E.164 normalization use
 * a library like google-libphonenumber or rely on Twilio's format helper.
 */
export function sanitizePhoneNumber(phone: string): string {
  if (!phone) return '';
  return String(phone)
    .replace(/[\s\-\(\)\.]/g, '')
    .trim();
}

/**
 * Attempt to normalize a phone number to E.164. Behavior:
 * - If number starts with '+' assume already E.164 and return as-is (after trimming)
 * - If starts with country code digits (e.g. '84' for Vietnam) prefix '+'
 * - If starts with a leading 0 and defaultCountry '84', convert 0XXXXXXXXX -> +84XXXXXXXXX
 * - Otherwise return the sanitized input prefixed with '+' if it looks like all-digits
 *
 * This helper favors common Vietnamese formats but is safe to use as a best-effort
 * normalizer in services that also accept legacy formats in DB.
 */
export function normalizeToE164(phone: string, defaultCountry = '84'): string {
  if (!phone) return '';
  const s = sanitizePhoneNumber(phone);
  if (!s) return '';
  if (s.startsWith('+')) return s;
  // already has country code like 841234... -> +841234...
  if (s.startsWith(defaultCountry)) return `+${s}`;
  // local format starting with 0 -> replace leading 0 with +<country>
  if (s.startsWith('0')) return `+${defaultCountry}${s.slice(1)}`;
  // fallback: if all digits, prefix +
  if (/^\d+$/.test(s)) return `+${s}`;
  return s;
}

export default {
  sanitizePhoneNumber,
  normalizeToE164,
};
