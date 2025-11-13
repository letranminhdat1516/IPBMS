import { isValidUuid } from '../src/shared/utils/uuid.util';

describe('uuid.util', () => {
  it('validates uuid-like strings', () => {
    expect(isValidUuid('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
    expect(isValidUuid('not-a-uuid')).toBe(false);
    expect(isValidUuid('')).toBe(false);
    expect(isValidUuid(undefined)).toBe(false);
  });
});
