import crypto from 'crypto';

export interface BuildVnpSignedQueryResult {
  canonical: string; // canonical string that was signed
  hash: string; // uppercase hex HMAC-SHA512
  query: string; // full query string to send (includes vnp_SecureHashType & vnp_SecureHash)
}

/** Encode according to RFC3986 (used for alternative canonicalization) */
function encodeRfc3986(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

export type VnpEncoding = 'form' | 'rfc3986';

const HMAC_ALGO = 'sha512';
const HASH_TYPE_VALUE = 'HmacSHA512';

function hmacSha512HexUpper(secret: string, data: string): string {
  return crypto.createHmac(HMAC_ALGO, secret).update(data, 'utf8').digest('hex').toUpperCase();
}

/**
 * Build signed VNPay query string.
 * - Only signs keys that start with `vnp_`.
 * - Does NOT include vnp_SecureHash or vnp_SecureHashType in the canonical string.
 * - By default appends vnp_SecureHashType=HmacSHA512 then vnp_SecureHash (UPPER HEX).
 */
export function buildVnpSignedQuery(
  params: Record<string, unknown>,
  secret: string,
  options: { encoding?: VnpEncoding; includeSecureHashType?: boolean } = {},
): BuildVnpSignedQueryResult {
  const encoding: VnpEncoding = options.encoding ?? 'form';
  const includeSecureHashType = options.includeSecureHashType ?? true;

  const trimmedSecret = String(secret ?? '').trim();
  if (!trimmedSecret) throw new Error('VNPAY secret missing');

  // Collect only vnp_ keys and normalize values to strings
  const paramsToSign: Record<string, string> = {};
  for (const [k, v] of Object.entries(params ?? {})) {
    if (!k || !k.startsWith('vnp_')) continue;
    if (v === undefined || v === null || v === '') continue;
    paramsToSign[k] = String(v);
  }

  // Defensive: ensure we don't sign existing secure fields
  delete paramsToSign.vnp_SecureHash;
  delete paramsToSign.vnp_SecureHashType;

  const keys = Object.keys(paramsToSign).sort();

  // Fast path: no parameters to sign
  if (keys.length === 0) {
    const canonical = '';
    const hash = hmacSha512HexUpper(trimmedSecret, canonical);
    const usp = new URLSearchParams();
    if (includeSecureHashType) usp.append('vnp_SecureHashType', HASH_TYPE_VALUE);
    usp.append('vnp_SecureHash', hash);
    return { canonical, hash, query: usp.toString() };
  }

  // Build canonical and compute hash based on chosen encoding
  if (encoding === 'form') {
    const usp = new URLSearchParams();
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      usp.append(k, paramsToSign[k]);
    }
    const canonical = usp.toString(); // application/x-www-form-urlencoded (spaces -> '+')
    const hash = hmacSha512HexUpper(trimmedSecret, canonical);

    // Append type then hash (type is not part of canonical)
    if (includeSecureHashType) usp.append('vnp_SecureHashType', HASH_TYPE_VALUE);
    usp.append('vnp_SecureHash', hash);
    const query = usp.toString();
    return { canonical, hash, query };
  }

  // RFC3986 encoding path (rarely used for webpay 2.1.0)
  const parts: string[] = new Array(keys.length);
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    parts[i] = `${encodeRfc3986(k)}=${encodeRfc3986(paramsToSign[k])}`;
  }
  const canonical = parts.join('&');
  const hash = hmacSha512HexUpper(trimmedSecret, canonical);
  let query = canonical;
  if (includeSecureHashType) query += `&vnp_SecureHashType=${encodeRfc3986(HASH_TYPE_VALUE)}`;
  query += `&vnp_SecureHash=${encodeRfc3986(hash)}`;
  return { canonical, hash, query };
}
