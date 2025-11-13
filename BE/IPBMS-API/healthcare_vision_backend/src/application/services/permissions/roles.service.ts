import { Injectable } from '@nestjs/common';
import { RolesRepository } from '../../../infrastructure/repositories/permissions/roles.repository';
import { Role } from '../../../core/entities/role.entity';

@Injectable()
export class RolesService {
  constructor(private readonly rolesRepository: RolesRepository) {}

  async create(createRoleDto: any): Promise<Role> {
    const role = await this.rolesRepository.createRole({
      name: createRoleDto.name,
      description: createRoleDto.description,
    });
    return role as Role;
  }

  async findAll(): Promise<Role[]> {
    const roles = await this.rolesRepository.findAllRoles();
    // Add a convenience field `permission_count` for frontend display
    return (roles as any[]).map((r) => {
      const count = Array.isArray(r.permissions) ? r.permissions.length : 0;
      return {
        ...r,
        // singular and plural aliases for frontend compatibility
        permission_count: count,
        permissions_count: count,
      };
    }) as Role[];
  }

  async findOne(id: string): Promise<Role | undefined> {
    const role = await this.rolesRepository.findRoleById(id);
    return role as Role | undefined;
  }

  async findByName(name: string): Promise<Role | undefined> {
    const role = await this.rolesRepository.findRoleByName(name);
    return role as Role | undefined;
  }

  async findRoleWithPermissions(id: string): Promise<Role | undefined> {
    const role = await this.rolesRepository.findRoleWithPermissions(id);
    return role as Role | undefined;
  }

  async update(id: string, updateRoleDto: any): Promise<Role | undefined> {
    const role = await this.rolesRepository.updateRole(id, {
      name: updateRoleDto.name,
      description: updateRoleDto.description,
    });
    return role as Role | undefined;
  }

  async remove(id: string): Promise<boolean> {
    return await this.rolesRepository.deleteRole(id);
  }

  async assignPermissionsToRole(roleId: string, permissionIds: string[]): Promise<void> {
    await this.rolesRepository.assignPermissionsToRole(roleId, permissionIds);
  }

  async getRolePermissions(roleId: string): Promise<any[]> {
    return await this.rolesRepository.getRolePermissions(roleId);
  }
}
