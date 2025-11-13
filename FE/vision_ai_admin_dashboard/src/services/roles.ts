import api from '@/lib/api';

export interface Role {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  permissions: Permission[];
  permission_count: number;
  permissions_count: number;
  permissions_label: string;
}

export interface Permission {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateRoleRequest {
  name: string;
  description?: string;
  permissions: string[];
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
  permissions?: string[];
}

export interface CreatePermissionRequest {
  name: string;
  description?: string;
}

export interface UpdatePermissionRequest {
  name?: string;
  description?: string;
}

// Roles API
export function getRoles(params?: { page?: number; limit?: number; search?: string }) {
  return api.get<Role[]>('/roles', params);
}

export function getRoleDetail(roleId: string) {
  return api.get<Role>(`/roles/${roleId}`);
}

export function createRole(data: CreateRoleRequest) {
  return api.post<Role>('/roles', data);
}

export function updateRole(roleId: string, data: UpdateRoleRequest) {
  return api.patch<Role>(`/roles/${roleId}`, data);
}

export function deleteRole(roleId: string) {
  return api.delete<{ deleted: boolean; role_id: string }>(`/roles/${roleId}`);
}

// Permissions API
export function getPermissions(params?: {
  page?: number;
  limit?: number;
  search?: string;
  resource?: string;
}) {
  return api.get<Permission[]>('/permissions', params);
}

export function getPermissionDetail(permissionId: string) {
  return api.get<Permission>(`/permissions/${permissionId}`);
}

export function createPermission(data: CreatePermissionRequest) {
  return api.post<Permission>('/permissions', data);
}

export function updatePermission(permissionId: string, data: UpdatePermissionRequest) {
  return api.patch<Permission>(`/permissions/${permissionId}`, data);
}

export function deletePermission(permissionId: string) {
  return api.delete<{ deleted: boolean; permission_id: string }>(`/permissions/${permissionId}`);
}

// Utility functions
export async function getAllRoles(): Promise<Role[]> {
  try {
    const response = await getRoles({ limit: 100 });
    return response || [];
  } catch (_error) {
    return [];
  }
}

export async function getAllPermissions(): Promise<Permission[]> {
  try {
    const response = await getPermissions({ limit: 100 });
    return response || [];
  } catch (_error) {
    return [];
  }
}

// Permission grouping by resource
export function groupPermissionsByResource(
  permissions: Permission[]
): Record<string, Permission[]> {
  return permissions.reduce(
    (acc, permission) => {
      // Extract resource from permission name (e.g., "read:events" -> "events")
      const resource = permission.name.split(':')[1] || permission.name;
      if (!acc[resource]) {
        acc[resource] = [];
      }
      acc[resource].push(permission);
      return acc;
    },
    {} as Record<string, Permission[]>
  );
}
