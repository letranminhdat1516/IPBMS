import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { SYSTEM_PERMISSION_KEY } from '../decorators/permission.decorator';

interface AuthUser {
  userId: string;
  role: string;
}

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private _reflector: Reflector,
    private readonly _prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permission = this._reflector.get<string>(SYSTEM_PERMISSION_KEY, context.getHandler());
    if (!permission) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user as AuthUser;
    if (!user) throw new ForbiddenException('Unauthenticated');

    if (user.role === 'admin') return true;

    // fetch roles assigned to user
    const userRoles: any[] = await (this._prisma as any).user_roles.findMany({
      where: { user_id: user.userId },
    });
    const roleIds = userRoles.map((r: any) => r.role_id);
    if (roleIds.length === 0) return false;

    const rolePerms: any[] = await (this._prisma as any).role_permissions.findMany({
      where: { role_id: { in: roleIds } },
      include: { permissions: true },
    });

    const permNames = new Set(rolePerms.map((rp: any) => rp.permissions.name));
    return permNames.has(permission);
  }
}
