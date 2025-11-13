import { buildOptionalNonNullFields } from '../../../src/shared/utils/helpers';

describe('buildOptionalNonNullFields', () => {
  test('includes only present non-null values', () => {
    const src = { a: 'x', b: null, c: undefined, d: 0, e: false, f: '' };
    const out = buildOptionalNonNullFields(['a', 'b', 'c', 'd', 'e', 'f', 'g'], src as any);
    expect(out).toEqual({ a: 'x', d: 0, e: false, f: '' });
  });

  test('returns empty object when no keys present or all null/undefined', () => {
    const src = { x: null };
    const out = buildOptionalNonNullFields(['a', 'b'], src as any);
    expect(out).toEqual({});
  });

  test('works when src is undefined', () => {
    const out = buildOptionalNonNullFields(['a', 'b'], undefined as any);
    expect(out).toEqual({});
  });
});
