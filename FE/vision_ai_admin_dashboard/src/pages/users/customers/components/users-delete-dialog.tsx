import { toast } from 'sonner';

import { useState } from 'react';

import { IconAlertTriangle } from '@tabler/icons-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { ConfirmDialog } from '@/components/confirm-dialog';

import { deleteUser } from '@/services/users';

import { User } from '../data/schema';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentRow: User;
}

export function UsersDeleteDialog({ open, onOpenChange, currentRow }: Props) {
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (value.trim() !== currentRow.username) return;
    setLoading(true);
    try {
      await deleteUser(currentRow.user_id);
      toast.success('Xóa người dùng thành công!');
      onOpenChange(false);
    } catch (_err) {
      toast.error('Xóa người dùng thất bại. Vui lòng thử lại!');
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
    />
  );
}
