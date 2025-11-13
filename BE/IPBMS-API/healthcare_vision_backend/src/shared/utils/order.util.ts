export type OrderDir = 'ASC' | 'DESC';

/**
 * Filter incoming order object by allowed fields. If nothing valid remains,
 * return the provided fallback.
 */
export function sanitizeOrder(
  order: Record<string, OrderDir> | undefined,
  allowedFields: readonly string[],
  fallback: Record<string, OrderDir>,
): Record<string, OrderDir> {
  if (!order || typeof order !== 'object') return fallback;
  const out: Record<string, OrderDir> = {};
  for (const [k, v] of Object.entries(order)) {
    if (allowedFields.includes(k)) {
      const dir = String(v).toUpperCase();
      out[k] = dir === 'ASC' ? 'ASC' : 'DESC';
    }
  }
  return Object.keys(out).length ? out : fallback;
}
