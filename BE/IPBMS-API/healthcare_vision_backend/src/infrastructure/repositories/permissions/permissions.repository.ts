import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UnitOfWork } from '../../database/unit-of-work.service';
import { BasePrismaRepository } from '../shared/base-prisma.repository';

export interface Permission {
  id: string;
  name: string;
  description?: string;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class PermissionsRepository extends BasePrismaRepository {
  constructor(
    protected readonly prismaService: PrismaService,
    protected readonly _unitOfWork: UnitOfWork,
  ) {
    super(prismaService, _unitOfWork);
  }

  async findPermissionById(id: string): Promise<Permission | null> {
    return super.findById<Permission>('permissions', id);
  }

  async findPermissionByName(name: string): Promise<Permission | null> {
    const result = await this.prisma.permissions.findFirst({
      where: { name },
    });
    return result as Permission | null;
  }

  async findAllPermissions(): Promise<Permission[]> {
    const result = await super.paginate<Permission>('permissions', { take: 1000 });
    return result.data as Permission[];
  }

  async createPermission(data: { name: string; description?: string }): Promise<Permission> {
    const result = await this.prisma.permissions.create({
      data: {
        name: data.name,
        description: data.description,
      },
    });
    return result as Permission;
  }

  async updatePermission(
    id: string,
    data: { name?: string; description?: string },
  ): Promise<Permission | null> {
    try {
      const result = await this.prisma.permissions.update({
        where: { id },
        data,
      });
      return result as Permission;
    } catch {
      return null;
    }
  }

  async deletePermission(id: string): Promise<boolean> {
    try {
      await this.prisma.permissions.delete({
        where: { id },
      });
      return true;
    } catch {
      return false;
    }
  }

  async findPermissionsByNames(names: string[]): Promise<Permission[]> {
    const result = await this.prisma.permissions.findMany({
      where: {
        name: {
          in: names,
        },
      },
    });
    return result as Permission[];
  }
}
