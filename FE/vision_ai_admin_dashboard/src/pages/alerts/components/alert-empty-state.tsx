import { AlertTriangle, Bell } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface AlertEmptyStateProps {
  isError?: boolean;
  onRetry?: () => void;
  onResetFilters?: () => void;
  onRefresh?: () => void;
}

export function AlertEmptyState({
  isError = false,
  onRetry,
  onResetFilters,
  onRefresh,
}: AlertEmptyStateProps) {
  if (isError) {
    return (
      <div className='flex flex-col items-center justify-center py-12 text-center'>
        <AlertTriangle className='text-destructive mb-4 h-12 w-12' />
        <h3 className='text-destructive mb-2 text-lg font-medium'>Không thể tải nhắc nhở</h3>
        <p className='text-muted-foreground mb-6 max-w-md text-sm'>
          Đã xảy ra lỗi khi tải danh sách nhắc nhở. Vui lòng kiểm tra kết nối mạng và thử lại.
        </p>
        <div className='flex gap-2'>
          <Button variant='outline' size='sm' onClick={onRetry}>
            Thử lại
          </Button>
          <Button variant='outline' size='sm' onClick={onResetFilters}>
            Đặt lại bộ lọc
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className='flex flex-col items-center justify-center py-12 text-center'>
      <Bell className='text-muted-foreground mb-4 h-12 w-12' />
      <h3 className='text-muted-foreground mb-2 text-lg font-medium'>
        Không tìm thấy nhắc nhở nào
      </h3>
      <p className='text-muted-foreground mb-6 max-w-md text-sm'>
        Hiện tại không có nhắc nhở nào phù hợp với bộ lọc đã chọn. Hãy thử điều chỉnh bộ lọc hoặc
        kiểm tra lại sau.
      </p>
      <div className='flex gap-2'>
        <Button variant='outline' size='sm' onClick={onResetFilters}>
          Xóa bộ lọc
        </Button>
        <Button variant='outline' size='sm' onClick={onRefresh}>
          Làm mới
        </Button>
      </div>
    </div>
  );
}
