import { Injectable } from '@nestjs/common';
import { PermissionsRepository } from '../../../infrastructure/repositories/permissions/permissions.repository';
import { Permission } from '../../../core/entities/permission.entity';

@Injectable()
export class PermissionsService {
  constructor(private readonly permissionsRepository: PermissionsRepository) {}

  async create(createPermissionDto: any): Promise<Permission> {
    const permission = await this.permissionsRepository.createPermission({
      name: createPermissionDto.name,
      description: createPermissionDto.description,
    });
    return permission as Permission;
  }

  async findAll(): Promise<Permission[]> {
    const permissions = await this.permissionsRepository.findAllPermissions();
    return permissions as Permission[];
  }

  async findOne(id: string): Promise<Permission | undefined> {
    const permission = await this.permissionsRepository.findPermissionById(id);
    return permission as Permission | undefined;
  }

  async findByName(name: string): Promise<Permission | undefined> {
    const permission = await this.permissionsRepository.findPermissionByName(name);
    return permission as Permission | undefined;
  }

  async update(id: string, updatePermissionDto: any): Promise<Permission | undefined> {
    const permission = await this.permissionsRepository.updatePermission(id, {
      name: updatePermissionDto.name,
      description: updatePermissionDto.description,
    });
    return permission as Permission | undefined;
  }

  async remove(id: string): Promise<boolean> {
    return await this.permissionsRepository.deletePermission(id);
  }

  async findByNames(names: string[]): Promise<Permission[]> {
    return await this.permissionsRepository.findPermissionsByNames(names);
  }
}
