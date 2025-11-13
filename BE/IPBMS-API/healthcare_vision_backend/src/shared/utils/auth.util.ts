import { UnauthorizedException } from '@nestjs/common';
import type { JwtUser } from '../types/auth.types';

export function getUserIdFromReq(req?: { user?: JwtUser }) {
  const userId = req?.user?.userId ?? req?.user?.sub;
  if (!userId) throw new UnauthorizedException('Người dùng chưa đăng nhập');
  return userId;
}
