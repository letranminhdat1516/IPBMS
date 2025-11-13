import { UnauthorizedException } from '@nestjs/common';
import { getUserIdFromReq } from '../../../src/shared/utils/auth.util';

describe('getUserIdFromReq', () => {
  it('returns userId when present on req.user.userId', () => {
    const req: any = { user: { userId: 'user-123' } };
    expect(getUserIdFromReq(req)).toBe('user-123');
  });

  it('falls back to sub when userId is missing', () => {
    const req: any = { user: { sub: 'sub-456' } };
    expect(getUserIdFromReq(req)).toBe('sub-456');
  });

  it('throws UnauthorizedException when no user present', () => {
    expect(() => getUserIdFromReq(undefined)).toThrow(UnauthorizedException);
    expect(() => getUserIdFromReq({} as any)).toThrow(UnauthorizedException);
    expect(() => getUserIdFromReq({ user: {} } as any)).toThrow(UnauthorizedException);
  });
});
