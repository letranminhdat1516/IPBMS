import { toast } from 'sonner';

import { useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { IconAlertTriangle } from '@tabler/icons-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { ConfirmDialog } from '@/components/confirm-dialog';

import type { Caregiver } from '@/types/user';

import { deleteUser } from '@/services/users';

type CaregiverMin = { user_id?: string | number; id?: string | number };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentRow: Caregiver;
  dialogProps?: Partial<React.ComponentProps<typeof ConfirmDialog>>;
}

export function CaregiverDeleteDialog({ open, onOpenChange, currentRow, dialogProps }: Props) {
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();
  const deleteMutation = useMutation({
    mutationFn: async (id: string | number) => deleteUser(id),
    onMutate: async (id: string | number) => {
      await queryClient.cancelQueries({ queryKey: ['caregivers'], exact: false });
      // Snapshot previous caches for rollback
      type CaregiverMin = { user_id?: string | number; id?: string | number };
      const previousCaregivers =
        (queryClient.getQueryData(['caregivers']) as unknown as CaregiverMin[]) ?? [];
      // Also handle paginated variants: get all queries whose key starts with 'caregivers'
      const previousCaregiversParams = queryClient.getQueriesData({
        queryKey: ['caregivers'],
        exact: false,
      });

      // Optimistically remove caregiver from cached lists
      queryClient.setQueryData(['caregivers'], (old: unknown) => {
        const list = (old as CaregiverMin[] | undefined) ?? [];
        return list.filter((c) => String(c.user_id ?? c.id ?? '') !== String(id));
      });

      previousCaregiversParams.forEach(([key, _data]) => {
        try {
          const qk = key as unknown as import('@tanstack/react-query').QueryKey;
          queryClient.setQueryData(qk, (old: unknown) => {
            if (!old) return old;
            // old may be an array or a paginated object { items, pagination }
            if (Array.isArray(old))
              return (old as CaregiverMin[]).filter((c) => String(c.user_id) !== String(id));
            const maybe = old as { items?: CaregiverMin[] };
            if (Array.isArray(maybe.items)) {
              return {
                ...maybe,
                items: maybe.items.filter((c) => String(c.user_id) !== String(id)),
              };
            }
            return old;
          });
        } catch (_err) {
          // ignore per-key errors
        }
      });

      return { previousCaregivers, previousCaregiversParams };
    },
    onError: (_err, _id, context) => {
      // rollback
      if (context?.previousCaregivers) {
        queryClient.setQueryData(['caregivers'], context.previousCaregivers as CaregiverMin[]);
      }
      // restore per-param caches
      if (context?.previousCaregiversParams) {
        (
          context.previousCaregiversParams as Array<
            [import('@tanstack/react-query').QueryKey, unknown]
          >
        ).forEach(([key, data]) => {
          try {
            queryClient.setQueryData(key, data);
          } catch (_e) {
            // ignore
          }
        });
      }
      toast.error('Xóa người dùng thất bại. Vui lòng thử lại!');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['caregivers'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['users'], exact: false });
    },
  });

  const handleDelete = async () => {
    if (value.trim() !== currentRow.username) return;
    setLoading(true);
    try {
      await deleteMutation.mutateAsync(currentRow.user_id);
      toast.success('Xóa người dùng thành công!');
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      handleConfirm={handleDelete}
      disabled={value.trim() !== currentRow.username || loading}
      title={
        <span className='text-destructive'>
          <IconAlertTriangle className='stroke-destructive mr-1 inline-block' size={18} /> Xóa người
          dùng
        </span>
      }
      desc={
        <div className='space-y-4'>
          <p className='mb-2'>
            Bạn có chắc chắn muốn xóa <span className='font-bold'>{currentRow.username}</span>?
            <br />
            Thao tác này sẽ xóa vĩnh viễn người dùng khỏi hệ thống và không thể hoàn tác.
          </p>
          <Label className='my-2'>
            Tên đăng nhập:
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder='Nhập tên đăng nhập để xác nhận xóa.'
              disabled={loading}
            />
          </Label>
          <Alert variant='destructive'>
            <AlertTitle>Cảnh báo!</AlertTitle>
            <AlertDescription>Hãy cẩn thận, thao tác này không thể hoàn tác.</AlertDescription>
          </Alert>
        </div>
      }
      confirmText={loading ? 'Đang xóa...' : 'Xóa'}
      destructive
      {...dialogProps}
    />
  );
}
