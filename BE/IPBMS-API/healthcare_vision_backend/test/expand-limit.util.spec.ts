import {
  parseExpandLimit,
  DEFAULT_EXPAND_LIMIT,
  MAX_EXPAND_LIMIT,
} from '../src/shared/utils/expand-limit.util';

describe('parseExpandLimit', () => {
  it('returns undefined for undefined/null', () => {
    expect(parseExpandLimit(undefined)).toBeUndefined();
    expect(parseExpandLimit(null)).toBeUndefined();
  });

  it('parses integer strings and numbers', () => {
    expect(parseExpandLimit('5')).toBe(5);
    expect(parseExpandLimit(10)).toBe(10);
  });

  it('returns NaN for non-integer or non-positive', () => {
    expect(Number.isNaN(parseExpandLimit('abc'))).toBeTruthy();
    expect(Number.isNaN(parseExpandLimit('1.5'))).toBeTruthy();
    expect(Number.isNaN(parseExpandLimit(0))).toBeTruthy();
    expect(Number.isNaN(parseExpandLimit(-3))).toBeTruthy();
  });

  it('clamps to MAX_EXPAND_LIMIT when value too large', () => {
    expect(parseExpandLimit(String(MAX_EXPAND_LIMIT + 100))).toBe(MAX_EXPAND_LIMIT);
  });
});
