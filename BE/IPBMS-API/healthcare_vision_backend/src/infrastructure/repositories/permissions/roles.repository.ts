import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UnitOfWork } from '../../database/unit-of-work.service';
import { BasePrismaRepository } from '../shared/base-prisma.repository';

export interface Role {
  id: string;
  name: string;
  description?: string;
  created_at: Date;
  updated_at: Date;
  permissions?: Permission[];
}

export interface Permission {
  id: string;
  name: string;
  description?: string;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class RolesRepository extends BasePrismaRepository {
  constructor(
    protected readonly prismaService: PrismaService,
    protected readonly _unitOfWork: UnitOfWork,
  ) {
    super(prismaService, _unitOfWork);
  }

  async findRoleById(id: string): Promise<Role | null> {
    return super.findById<Role>('roles', id);
  }

  async findRoleByName(name: string): Promise<Role | null> {
    const result = await this.prisma.roles.findFirst({
      where: { name },
    });
    return result as Role | null;
  }

  async findAllRoles(): Promise<Role[]> {
    // Use raw SQL to avoid strict Prisma 'include' typing issues and map permissions manually
    const roles = await this.prisma.$queryRaw<Role[]>`
      SELECT r.* FROM roles r
      ORDER BY r.created_at DESC
      LIMIT 1000
    `;

    // Fetch permissions per role using a single query and group them
    const perms = await this.prisma.$queryRaw<any[]>`
      SELECT rp.role_id, p.* FROM role_permissions rp
      JOIN permissions p ON p.id = rp.permission_id
      WHERE rp.role_id IN (${roles.map((r) => r.id)})
    `;

    const permsByRole: Record<string, Permission[]> = {};
    perms.forEach((p) => {
      permsByRole[p.role_id] = permsByRole[p.role_id] || [];
      permsByRole[p.role_id].push({
        id: p.id,
        name: p.name,
        description: p.description,
        created_at: p.created_at,
        updated_at: p.updated_at,
      });
    });

    return roles.map((r) => ({
      ...r,
      permissions: permsByRole[r.id] || [],
    }));
  }

  async findRoleWithPermissions(id: string): Promise<Role | null> {
    const roles = await this.prisma.$queryRaw<Role[]>`
      SELECT r.* FROM roles r WHERE r.id = ${id} LIMIT 1
    `;
    const role = roles[0];
    if (!role) return null;

    const perms = await this.prisma.$queryRaw<any[]>`
      SELECT p.* FROM role_permissions rp
      JOIN permissions p ON p.id = rp.permission_id
      WHERE rp.role_id = ${id}
    `;

    return {
      ...role,
      permissions: perms.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        created_at: p.created_at,
        updated_at: p.updated_at,
      })),
    } as Role;
  }

  async createRole(data: { name: string; description?: string }): Promise<Role> {
    const result = await this.prisma.roles.create({
      data: {
        name: data.name,
        description: data.description,
      },
    });
    return result as Role;
  }

  async updateRole(
    id: string,
    data: { name?: string; description?: string },
  ): Promise<Role | null> {
    try {
      const result = await this.prisma.roles.update({
        where: { id },
        data,
      });
      return result as Role;
    } catch {
      return null;
    }
  }

  async deleteRole(id: string): Promise<boolean> {
    try {
      await this.prisma.roles.delete({
        where: { id },
      });
      return true;
    } catch {
      return false;
    }
  }

  async assignPermissionsToRole(roleId: string, permissionIds: string[]): Promise<void> {
    // Remove existing permissions
    await this.prisma.role_permissions.deleteMany({
      where: { role_id: roleId },
    });

    // Add new permissions
    if (permissionIds.length > 0) {
      await this.prisma.role_permissions.createMany({
        data: permissionIds.map((permissionId) => ({
          role_id: roleId,
          permission_id: permissionId,
        })),
      });
    }
  }

  async getRolePermissions(roleId: string): Promise<Permission[]> {
    const perms = await this.prisma.$queryRaw<any[]>`
      SELECT p.* FROM role_permissions rp
      JOIN permissions p ON p.id = rp.permission_id
      WHERE rp.role_id = ${roleId}
    `;

    return perms.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      created_at: p.created_at,
      updated_at: p.updated_at,
    }));
  }
}
