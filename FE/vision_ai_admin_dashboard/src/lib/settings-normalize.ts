/* Helper utilities to normalize system settings responses from the API.
 * Backend may return either a raw value (primitive or object) or an object
 * shape like { key, value, description }. The frontend previously duplicated
 * logic to extract and stringify values in multiple places. Put the logic
 * here so callers can get a stable Record<string, string | undefined>
 * suitable for passing into form initial values.
 */

export function extractSettingValue(raw: unknown): { value?: unknown; description?: string } {
  if (raw === undefined || raw === null) return { value: undefined };
  if (typeof raw === 'object') {
    try {
      const r = raw as Record<string, unknown>;
      if ('value' in r) {
        return { value: r.value, description: r.description as string };
      }
      // If it's an object without 'value' field, treat the whole object as value
      return { value: r };
    } catch {
      return { value: undefined };
    }
  }
  // primitives (string/number/boolean)
  return { value: raw };
}

// Note: intentionally no default export — use named exports:
// import { normalizeSettingsToInitialStrings, extractSettingValue } from '@/lib/settings-normalize';
