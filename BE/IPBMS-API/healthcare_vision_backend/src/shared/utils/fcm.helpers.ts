import { Request } from 'express';

export function getRequesterId(req: Request & { user?: any }): string | undefined {
  return req?.user?.userId ?? req?.user?.sub;
}

export function sanitizeRecipients(toUserIds: any, requesterId?: string): string[] {
  const incoming = Array.isArray(toUserIds) ? toUserIds : [];
  return Array.from(new Set(incoming.filter((id) => id && id !== requesterId)));
}

export function extractRoles(req: Request & { user?: any }): string[] {
  const roles = req.user?.role;
  return Array.isArray(roles) ? roles : [roles].filter(Boolean);
}
