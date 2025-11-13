export const DEFAULT_EXPAND_LIMIT = 20;
export const MAX_EXPAND_LIMIT = 100;

export function parseExpandLimit(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return NaN as any;
  if (n <= 0) return NaN as any;
  if (n > MAX_EXPAND_LIMIT) return MAX_EXPAND_LIMIT;
  return n;
}
