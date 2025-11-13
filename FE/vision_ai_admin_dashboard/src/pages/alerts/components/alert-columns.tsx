import { ColumnDef } from '@tanstack/react-table';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import type { Notification } from '@/types/notification';

const statusConfig = {
  pending: { color: 'bg-yellow-100 text-yellow-800' },
  acknowledged: { color: 'bg-blue-100 text-blue-800' },
  resolved: { color: 'bg-green-100 text-green-800' },
  dismissed: { color: 'bg-gray-100 text-gray-800' },
  active: { color: 'bg-red-100 text-red-800' },
};

const severityConfig = {
  low: { color: 'bg-blue-100 text-blue-800' },
  medium: { color: 'bg-yellow-100 text-yellow-800' },
  high: { color: 'bg-orange-100 text-orange-800' },
  critical: { color: 'bg-red-100 text-red-800' },
};

const alertTypeConfig = {
  system: { color: 'bg-purple-100 text-purple-800' },
  security: { color: 'bg-red-100 text-red-800' },
  performance: { color: 'bg-blue-100 text-blue-800' },
  maintenance: { color: 'bg-orange-100 text-orange-800' },
  emergency: { color: 'bg-red-100 text-red-800' },
};

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const alertColumns: ColumnDef<Notification>[] = [
  {
    accessorKey: 'notification_id',
    header: 'ID',
    cell: ({ row }) => {
      const notificationId = row.getValue('notification_id') as string;
      return <div className='font-medium'>#{String(notificationId).slice(-8) || 'N/A'}</div>;
    },
  },
  {
    accessorKey: 'status',
    header: 'Trạng Thái',
    cell: ({ row }) => {
      const status = (row.getValue('status') as string) || 'pending';
      return (
        <Badge
          variant='outline'
          className={statusConfig[status as keyof typeof statusConfig]?.color}
        >
          {status === 'pending'
            ? 'Đang Chờ'
            : status === 'acknowledged'
              ? 'Đã Xác Nhận'
              : status === 'resolved'
                ? 'Đã Giải Quyết'
                : status === 'dismissed'
                  ? 'Đã Bỏ Qua'
                  : status}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'severity',
    header: 'Mức Độ',
    cell: ({ row }) => {
      const severity = (row.getValue('severity') as string) || 'medium';
      return (
        <Badge
          variant='outline'
          className={severityConfig[severity as keyof typeof severityConfig]?.color}
        >
          {severity === 'low'
            ? 'Thấp'
            : severity === 'medium'
              ? 'Trung Bình'
              : severity === 'high'
                ? 'Cao'
                : severity === 'critical'
                  ? 'Nghiêm Trọng'
                  : severity}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'business_type',
    header: 'Loại',
    cell: ({ row }) => {
      const alertType = (row.getValue('business_type') as string) || 'system';
      return (
        <Badge
          variant='outline'
          className={alertTypeConfig[alertType as keyof typeof alertTypeConfig]?.color}
        >
          {alertType === 'system'
            ? 'Hệ Thống'
            : alertType === 'security'
              ? 'Bảo Mật'
              : alertType === 'performance'
                ? 'Hiệu Suất'
                : alertType === 'maintenance'
                  ? 'Bảo Trì'
                  : alertType === 'emergency'
                    ? 'Khẩn Cấp'
                    : alertType}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'message',
    header: 'Thông Báo',
    cell: ({ row }) => {
      const alert = row.original;
      return (
        <div className='max-w-xs space-y-1'>
          <div className='text-sm font-medium'>{alert.title || 'Thông báo'}</div>
          {alert.message && (
            <div className='text-muted-foreground line-clamp-2 text-xs'>{alert.message}</div>
          )}
          {alert.event_id && (
            <div className='text-muted-foreground text-xs'>
              Sự kiện: {String(alert.event_id).slice(-8)}
            </div>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'created_at',
    header: 'Thời Gian',
    cell: ({ row }) => {
      const createdAt = row.getValue('created_at') as string;
      return <div className='text-muted-foreground text-sm'>{formatDate(createdAt)}</div>;
    },
  },
  {
    id: 'actions',
    header: 'Thao Tác',
    cell: ({ row }) => {
      const status = (row.getValue('status') as string) || 'pending';
      return (
        <div className='flex justify-end gap-2'>
          {status === 'pending' && (
            <>
              <Button variant='outline' size='sm'>
                Xác Nhận
              </Button>
              <Button variant='outline' size='sm'>
                Bỏ Qua
              </Button>
            </>
          )}
          {status === 'acknowledged' && (
            <Button variant='outline' size='sm'>
              Giải Quyết
            </Button>
          )}
          <Button variant='ghost' size='sm'>
            Chi Tiết
          </Button>
        </div>
      );
    },
  },
];
