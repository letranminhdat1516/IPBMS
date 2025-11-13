import { getRequesterId, sanitizeRecipients, extractRoles } from '../src/shared/utils/fcm.helpers';

describe('fcm.helpers', () => {
  it('getRequesterId should return userId or sub', () => {
    expect(getRequesterId({ user: { userId: 'u1' } } as any)).toBe('u1');
    expect(getRequesterId({ user: { sub: 's1' } } as any)).toBe('s1');
    expect(getRequesterId({} as any)).toBeUndefined();
  });

  it('sanitizeRecipients should dedupe and remove requesterId and falsy values', () => {
    const input = ['a', 'b', 'a', '', null, undefined, 'c'];
    expect(sanitizeRecipients(input, 'b')).toEqual(['a', 'c']);
  });

  it('extractRoles should normalize role scalar or array', () => {
    expect(extractRoles({ user: { role: 'admin' } } as any)).toEqual(['admin']);
    expect(extractRoles({ user: { role: ['a', 'b'] } } as any)).toEqual(['a', 'b']);
  });
});
