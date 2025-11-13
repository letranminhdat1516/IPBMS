/**
 * Recursively remove properties with null or undefined values from objects/arrays.
 * Preserves empty objects/arrays; only strips keys whose value is strictly null or undefined.
 */
export function pruneNulls<T>(input: T): T {
  if (input === null || input === undefined) return input;
  if (Array.isArray(input)) {
    return input.map((item) => pruneNulls(item)) as any;
  }
  if (typeof input !== 'object') return input;

  const out: any = {};
  for (const [k, v] of Object.entries(input as any)) {
    if (v === null || v === undefined) continue;
    if (typeof v === 'object') {
      out[k] = pruneNulls(v as any);
    } else {
      out[k] = v;
    }
  }
  return out as T;
}
