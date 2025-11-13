import { toCamelCase } from '@/utils/string';

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return Object.prototype.toString.call(v) === '[object Object]';
}

export function mapKeysToCamel<T = unknown>(input: unknown): T {
  if (Array.isArray(input)) {
    return input.map((i) => mapKeysToCamel(i)) as unknown as T;
  }

  if (isPlainObject(input)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input)) {
      const nk = toCamelCase(k);
      out[nk] = mapKeysToCamel(v);
    }
    return out as unknown as T;
  }

  return input as T;
}

export default mapKeysToCamel;
