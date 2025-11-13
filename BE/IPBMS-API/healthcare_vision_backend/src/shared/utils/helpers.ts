/**
 * Build an object containing the listed keys from a source object.
 * If a key exists on the source, its value (including explicit null) is preserved.
 * If a key does not exist on the source, the key will be present with value null.
 *
 * Example:
 *  buildOptionalFields(['a','b'], { a: 'x' }) -> { a: 'x', b: null }
 */
export function buildOptionalFields<T extends string = string>(
  keys: T[],
  src: Record<string, any> | undefined | null,
): Record<T, any> {
  const out = {} as Record<T, any>;
  const source = src ?? {};
  for (const k of keys) {
    // if property exists on source (even if undefined), treat as present
    if (Object.prototype.hasOwnProperty.call(source, k)) {
      out[k] = (source as any)[k];
    } else {
      out[k] = null;
    }
  }
  return out;
}

/**
 * Build a standardized activity payload for ActivityLogsService.create
 * Keeps shape stable across callers and centralizes common fields.
 */
export function buildActivityPayload(opts: {
  actor_id?: string | null;
  actor_name?: string | null;
  action: string;
  resource_type?: string | null;
  resource_id?: string | null;
  resource_name?: string | null;
  message?: string | null;
  severity?: any;
  meta?: Record<string, any> | null;
}) {
  return {
    actor_id: opts.actor_id ?? null,
    actor_name: opts.actor_name ?? null,
    action: opts.action,
    resource_type: opts.resource_type ?? null,
    resource_id: opts.resource_id ?? null,
    resource_name: opts.resource_name ?? null,
    message: opts.message ?? null,
    severity: opts.severity ?? null,
    meta: opts.meta ?? null,
  } as any;
}

/**
 * Build an object containing only keys that are present on the source AND whose
 * values are non-null (explicit null/undefined are omitted).
 *
 * This is useful when callers want to avoid emitting explicit nulls for
 * optional fields (so downstream persistence layers know the value was not
 * provided rather than intentionally set to null).
 */
export function buildOptionalNonNullFields<T extends string = string>(
  keys: T[],
  src: Record<string, any> | undefined | null,
): Partial<Record<T, any>> {
  const out = {} as Partial<Record<T, any>>;
  const source = src ?? {};
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(source, k)) {
      const v = (source as any)[k];
      if (v !== null && v !== undefined) {
        out[k] = v;
      }
    }
  }
  return out;
}
