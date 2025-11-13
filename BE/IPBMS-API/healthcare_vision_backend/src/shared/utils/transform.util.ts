import { TransformFnParams } from 'class-transformer';

export function parseJsonOrUndefined({ value }: TransformFnParams) {
  if (value === '' || value === null || value === undefined) return undefined;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      // Return original string so validation can report a useful error
      return value;
    }
  }
  return value;
}

/**
 * Simple transform that maps empty string/null to undefined. Useful for scalar fields.
 * @example @Transform(emptyToUndefined)
 */
export function emptyToUndefined({ value }: TransformFnParams) {
  return value === '' || value === null || value === undefined ? undefined : value;
}
