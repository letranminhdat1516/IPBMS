import { formatDateVN } from '@/utils';
import { Edit, Eye, Key, Plus, Settings, Shield, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';

import { useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Header } from '@/components/layout/header';
import { Main } from '@/components/layout/main';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import {
  type Permission,
  type Role,
  deletePermission,
  deleteRole,
  getPermissions,
  getRoles,
} from '@/services/roles';

import { CreatePermissionDialog } from './components/create-permission-dialog';
import { CreateRoleDialog } from './components/create-role-dialog';

export default function RolesPermissionsManagementPage() {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('roles');
  const queryClient = useQueryClient();

  // Roles Query
  const {
    data: rolesData,
    isLoading: rolesLoading,
    error: rolesError,
  } = useQuery({
    queryKey: ['roles', { search }],
    queryFn: () => getRoles({ search: search || undefined, limit: 100 }),
  });

  const roles = rolesData || [];

  // Permissions Query
  const {
    data: permissionsData,
    isLoading: permissionsLoading,
    error: permissionsError,
  } = useQuery({
    queryKey: ['permissions', { search }],
    queryFn: () => getPermissions({ search: search || undefined, limit: 100 }),
  });

  const permissions = permissionsData || [];

  // Delete Role Mutation
  const deleteRoleMutation = useMutation({
    mutationFn: deleteRole,
    onSuccess: () => {
      toast.success('Xóa role thành công');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: () => {
      toast.error('Có lỗi xảy ra khi xóa role');
    },
  });

  // Delete Permission Mutation
  const deletePermissionMutation = useMutation({
    mutationFn: deletePermission,
    onSuccess: () => {
      toast.success('Xóa permission thành công');
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
    },
    onError: () => {
      toast.error('Có lỗi xảy ra khi xóa permission');
    },
  });

  const handleDeleteRole = (roleId: string, roleName: string) => {
    if (confirm(`Bạn có chắc chắn muốn xóa role "${roleName}"?`)) {
      deleteRoleMutation.mutate(roleId);
    }
  };

  const handleDeletePermission = (permissionId: string, permissionName: string) => {
    if (confirm(`Bạn có chắc chắn muốn xóa permission "${permissionName}"?`)) {
      deletePermissionMutation.mutate(permissionId);
    }
  };

  // Group permissions by resource
  const groupedPermissions = permissions.reduce(
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

  const filteredRoles = (roles || []).filter(
    (role) =>
      search === '' ||
      role.name.toLowerCase().includes(search.toLowerCase()) ||
      role.description?.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <>
      <Header>
        <div className='flex items-center gap-4'>
          <Shield className='h-6 w-6' />
          <div>
            <h1 className='text-2xl font-bold'>Quản lý Roles & Permissions</h1>
            <p className='text-muted-foreground'>
              Quản lý quyền truy cập và vai trò trong hệ thống
            </p>
          </div>
        </div>
      </Header>

      <Main>
        <div className='space-y-6'>
          {/* Stats Cards */}
          <div className='grid gap-4 md:grid-cols-4'>
            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>Tổng Roles</CardTitle>
                <Users className='text-muted-foreground h-4 w-4' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>{roles.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>Tổng Roles</CardTitle>
                <Users className='text-muted-foreground h-4 w-4' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>{roles.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>Tổng Permissions</CardTitle>
                <Key className='text-muted-foreground h-4 w-4' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>{permissions.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>Tài nguyên</CardTitle>
                <Settings className='text-muted-foreground h-4 w-4' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>{Object.keys(groupedPermissions).length}</div>
              </CardContent>
            </Card>
          </div>

          {/* Controls */}
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-2'>
              <Input
                placeholder='Tìm kiếm roles hoặc permissions...'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className='w-80'
              />
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className='flex items-center justify-between'>
              <TabsList>
                <TabsTrigger value='roles'>Vai trò</TabsTrigger>
                <TabsTrigger value='permissions'>Quyền</TabsTrigger>
              </TabsList>

              <div className='flex items-center space-x-2'>
                {activeTab === 'roles' && (
                  <CreateRoleDialog>
                    <Button>
                      <Plus className='mr-2 h-4 w-4' />
                      Tạo Role Mới
                    </Button>
                  </CreateRoleDialog>
                )}
                {activeTab === 'permissions' && (
                  <CreatePermissionDialog>
                    <Button>
                      <Plus className='mr-2 h-4 w-4' />
                      Tạo Permission Mới
                    </Button>
                  </CreatePermissionDialog>
                )}
              </div>
            </div>

            {/* Roles Tab */}
            <TabsContent value='roles'>
              <Card>
                <CardHeader>
                  <CardTitle>Danh sách Roles</CardTitle>
                  <CardDescription>Tất cả vai trò trong hệ thống</CardDescription>
                </CardHeader>
                <CardContent>
                  {rolesLoading ? (
                    <div className='flex justify-center py-8'>
                      <div className='text-muted-foreground'>Đang tải...</div>
                    </div>
                  ) : rolesError ? (
                    <div className='text-destructive flex justify-center py-8'>
                      Có lỗi xảy ra khi tải dữ liệu
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tên Role</TableHead>
                          <TableHead>Mô tả</TableHead>
                          <TableHead>Quyền</TableHead>
                          <TableHead>Ngày tạo</TableHead>
                          <TableHead className='text-right'>Thao tác</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRoles.map((role: Role) => (
                          <TableRow key={role.id}>
                            <TableCell className='font-medium'>{role.name}</TableCell>
                            <TableCell>{role.description || '-'}</TableCell>
                            <TableCell>
                              <Badge variant='outline'>
                                {(role.permissions || [])?.length} quyền
                              </Badge>
                            </TableCell>
                            <TableCell>{formatDateVN(new Date(role.created_at))}</TableCell>
                            <TableCell className='text-right'>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant='ghost' size='sm'>
                                    <Settings className='h-4 w-4' />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align='end'>
                                  <DropdownMenuItem disabled>
                                    <Eye className='mr-2 h-4 w-4' />
                                    Xem chi tiết (Coming Soon)
                                  </DropdownMenuItem>
                                  <DropdownMenuItem disabled>
                                    <Edit className='mr-2 h-4 w-4' />
                                    Chỉnh sửa (Coming Soon)
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className='text-destructive'
                                    onClick={() => handleDeleteRole(role.id, role.name)}
                                  >
                                    <Trash2 className='mr-2 h-4 w-4' />
                                    Xóa role
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Permissions Tab */}
            <TabsContent value='permissions'>
              <Card>
                <CardHeader>
                  <CardTitle>Danh sách Permissions</CardTitle>
                  <CardDescription>
                    Tất cả quyền truy cập trong hệ thống, nhóm theo resource
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {permissionsLoading ? (
                    <div className='flex justify-center py-8'>
                      <div className='text-muted-foreground'>Đang tải...</div>
                    </div>
                  ) : permissionsError ? (
                    <div className='text-destructive flex justify-center py-8'>
                      Có lỗi xảy ra khi tải dữ liệu
                    </div>
                  ) : (
                    <div className='space-y-6'>
                      {Object.entries(groupedPermissions).map(([resource, resourcePermissions]) => (
                        <div key={resource}>
                          <h3 className='mb-3 text-lg font-semibold capitalize'>
                            {resource}
                            <Badge variant='secondary' className='ml-2'>
                              {resourcePermissions.length} quyền
                            </Badge>
                          </h3>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Tên Permission</TableHead>
                                <TableHead>Mô tả</TableHead>
                                <TableHead>Ngày tạo</TableHead>
                                <TableHead className='text-right'>Thao tác</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {resourcePermissions
                                .filter(
                                  (permission) =>
                                    search === '' ||
                                    permission.name.toLowerCase().includes(search.toLowerCase())
                                )
                                .map((permission: Permission) => (
                                  <TableRow key={permission.id}>
                                    <TableCell className='font-medium'>{permission.name}</TableCell>
                                    <TableCell>{permission.description || '-'}</TableCell>
                                    <TableCell>
                                      {formatDateVN(new Date(permission.created_at))}
                                    </TableCell>
                                    <TableCell className='text-right'>
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant='ghost' size='sm'>
                                            <Settings className='h-4 w-4' />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align='end'>
                                          <DropdownMenuItem disabled>
                                            <Eye className='mr-2 h-4 w-4' />
                                            Xem chi tiết (Coming Soon)
                                          </DropdownMenuItem>
                                          <DropdownMenuItem disabled>
                                            <Edit className='mr-2 h-4 w-4' />
                                            Chỉnh sửa (Coming Soon)
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            className='text-destructive'
                                            onClick={() =>
                                              handleDeletePermission(permission.id, permission.name)
                                            }
                                          >
                                            <Trash2 className='mr-2 h-4 w-4' />
                                            Xóa permission
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </TableCell>
                                  </TableRow>
                                ))}
                            </TableBody>
                          </Table>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </Main>
    </>
  );
}
