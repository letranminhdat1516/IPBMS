import { Request } from 'express';

export interface JwtUser {
  userId: string;
  sub?: string;
  role?: string;
  phone_number?: any;
  email?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtUser;
}
