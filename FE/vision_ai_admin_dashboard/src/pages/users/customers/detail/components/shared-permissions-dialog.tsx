import { toast } from 'sonner';

import { useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { useCaregiver } from '@/services/caregivers';
import {
  useDeleteSharedPermissions,
  useSharedPermissionsList,
  useUpdateSharedPermissions,
} from '@/services/shared-permissions';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string | number;
}

export default function SharedPermissionsDialog({ open, onOpenChange, customerId }: Props) {
  const qc = useQueryClient();
  const { data } = useSharedPermissionsList(customerId);
  const update = useUpdateSharedPermissions();
  const del = useDeleteSharedPermissions();

  const [editing, setEditing] = useState<string | null>(null);
  const [localPerms, setLocalPerms] = useState<Record<string, string[]>>({});

  const onToggle = (caregiverId: string, permission: string) => {
    const current = localPerms[caregiverId] || [];
    const next = current.includes(permission)
      ? current.filter((p) => p !== permission)
      : [...current, permission];
    setLocalPerms((s) => ({ ...s, [caregiverId]: next }));
  };

  const handleSave = async (caregiverId: string) => {
    try {
      const permissions = localPerms[caregiverId] ?? [];
      await update.mutateAsync({ customerId, caregiverId, body: { permissions } });
      toast.success('Cập nhật shared permissions thành công');
      qc.invalidateQueries({ queryKey: ['shared-permissions', customerId] });
      setEditing(null);
    } catch (_err) {
      toast.error('Lỗi khi cập nhật');
    }
  };

  const handleDelete = async (caregiverId: string) => {
    if (!confirm('Bạn có chắc muốn xóa shared permissions cho caregiver này?')) return;
    try {
      await del.mutateAsync({ customerId, caregiverId });
      toast.success('Xóa thành công');
      qc.invalidateQueries({ queryKey: ['shared-permissions', customerId] });
    } catch (_err) {
      toast.error('Lỗi khi xóa');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[720px]'>
        <DialogHeader>
          <DialogTitle>Quản lý Shared Permissions</DialogTitle>
        </DialogHeader>

        <Card>
          <CardHeader>
            <CardTitle>Danh sách shared permissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='space-y-3'>
              {(data?.items || []).map((sp) => (
                <div
                  key={`${sp.customer_id}-${sp.caregiver_id}`}
                  className='flex items-start justify-between gap-4'
                >
                  <div className='flex items-center gap-3'>
                    <CaregiverName id={sp.caregiver_id} />
                    <div className='text-muted-foreground text-sm'>{sp.permissions.join(', ')}</div>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Button
                      size='sm'
                      variant='outline'
                      onClick={() => {
                        setEditing(sp.caregiver_id);
                        setLocalPerms((s) => ({ ...s, [sp.caregiver_id]: sp.permissions }));
                      }}
                    >
                      Sửa
                    </Button>
                    <Button
                      size='sm'
                      variant='destructive'
                      onClick={() => handleDelete(sp.caregiver_id)}
                    >
                      Xóa
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {editing && (
          <Card className='mt-4'>
            <CardHeader>
              <CardTitle>
                Chỉnh sửa:{' '}
                <span className='ml-2'>
                  <CaregiverName id={editing} />
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* For simplicity, use a fixed set of possible permissions derived from existing ones */}
              {(Array.from(new Set((data?.items || []).flatMap((i) => i.permissions))) || []).map(
                (perm) => (
                  <div key={perm} className='flex items-center gap-2'>
                    <Checkbox
                      checked={(localPerms[editing] || []).includes(perm)}
                      onCheckedChange={() => onToggle(editing, perm)}
                    />
                    <span>{perm}</span>
                  </div>
                )
              )}
            </CardContent>
            <div className='mt-3 flex justify-end gap-2'>
              <Button variant='outline' onClick={() => setEditing(null)}>
                Hủy
              </Button>
              <Button onClick={() => handleSave(editing)}>Lưu</Button>
            </div>
          </Card>
        )}

        <DialogFooter>
          <Button variant='secondary' onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CaregiverName({ id }: { id: string | number }) {
  const { data, isLoading } = useCaregiver(id);
  if (isLoading) return <span className='text-muted-foreground'>Đang tải...</span>;
  const name = data?.full_name ?? String(id);
  const dataObj = data as unknown as Record<string, unknown> | undefined;
  const avatarUrl =
    (dataObj?.['avatar'] as string | undefined) ?? (dataObj?.['avatar_url'] as string | undefined);
  const phone =
    (dataObj?.['phone'] as string | undefined) ?? (dataObj?.['phone_number'] as string | undefined);

  return (
    <div className='flex items-center gap-3'>
      <Avatar className='h-8 w-8'>
        {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
        <AvatarFallback>{name ? name.charAt(0).toUpperCase() : '?'}</AvatarFallback>
      </Avatar>
      <div>
        <div className='leading-tight font-medium'>{name}</div>
        {phone ? <div className='text-muted-foreground text-sm'>{phone}</div> : null}
      </div>
    </div>
  );
}
