import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

import {
  type CreateRoleRequest,
  type Permission,
  createRole,
  getPermissions,
} from '@/services/roles';

interface CreateRoleDialogProps {
  children: React.ReactNode;
}

interface FormData {
  name: string;
  description: string;
  permissions: string[];
}

export function CreateRoleDialog({ children }: CreateRoleDialogProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    defaultValues: {
      name: '',
      description: '',
      permissions: [],
    },
  });

  // Get all permissions for selection
  const { data: permissions = [] } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => getPermissions({ limit: 100 }),
  });

  // Group permissions by resource for better UI
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

  const createRoleMutation = useMutation({
    mutationFn: createRole,
    onSuccess: () => {
      toast.success('Tạo role thành công');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setOpen(false);
      form.reset();
    },
    onError: () => {
      toast.error('Có lỗi xảy ra khi tạo role');
    },
  });

  const onSubmit = (data: FormData) => {
    const payload: CreateRoleRequest = {
      name: data.name,
      description: data.description || undefined,
      permissions: data.permissions,
    };
    createRoleMutation.mutate(payload);
  };

  const handlePermissionChange = (permissionId: string, checked: boolean) => {
    const currentPermissions = form.getValues('permissions');
    if (checked) {
      form.setValue('permissions', [...currentPermissions, permissionId]);
    } else {
      form.setValue(
        'permissions',
        currentPermissions.filter((id) => id !== permissionId)
      );
    }
  };

  const selectedPermissions = form.watch('permissions');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className='max-h-[80vh] max-w-2xl overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>Tạo Role Mới</DialogTitle>
          <DialogDescription>
            Tạo vai trò mới và gán quyền truy cập cho vai trò này
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
            <FormField
              control={form.control}
              name='name'
              rules={{ required: 'Tên role là bắt buộc' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên Role</FormLabel>
                  <FormControl>
                    <Input placeholder='Nhập tên role...' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='description'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mô tả (Tùy chọn)</FormLabel>
                  <FormControl>
                    <Textarea placeholder='Mô tả về role này...' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className='space-y-4'>
              <div className='flex items-center justify-between'>
                <FormLabel>Quyền truy cập</FormLabel>
                <Badge variant='outline'>{selectedPermissions.length} quyền đã chọn</Badge>
              </div>

              <div className='max-h-60 overflow-y-auto rounded-lg border p-4'>
                {Object.entries(groupedPermissions).map(([resource, resourcePermissions]) => (
                  <div key={resource} className='mb-4'>
                    <h4 className='mb-2 text-sm font-medium capitalize'>{resource}</h4>
                    <div className='ml-4 space-y-2'>
                      {resourcePermissions.map((permission) => (
                        <div key={permission.id} className='flex items-center space-x-2'>
                          <Checkbox
                            id={permission.id}
                            checked={selectedPermissions.includes(permission.id)}
                            onCheckedChange={(checked) =>
                              handlePermissionChange(permission.id, checked as boolean)
                            }
                          />
                          <label
                            htmlFor={permission.id}
                            className='text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
                          >
                            {permission.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className='flex justify-end space-x-2'>
              <Button type='button' variant='outline' onClick={() => setOpen(false)}>
                Hủy
              </Button>
              <Button type='submit' disabled={createRoleMutation.isPending}>
                {createRoleMutation.isPending ? 'Đang tạo...' : 'Tạo Role'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
