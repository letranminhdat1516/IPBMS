import { ColumnDef } from '@tanstack/react-table';

import { Badge } from '@/components/ui/badge';

import type { FcmToken } from '@/types/fcm-token';

import { FcmTokenRowActions } from './fcm-tokens-row-actions';

export const fcmTokenColumns: ColumnDef<FcmToken>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
    cell: (info) => <span className='font-mono text-xs'>{String(info.getValue() ?? '-')}</span>,
    enableSorting: true,
  },
  {
    accessorKey: 'user_id',
    header: 'User ID',
    cell: (info) => <span className='font-mono text-xs'>{String(info.getValue() ?? '-')}</span>,
    enableSorting: true,
  },
  {
    accessorKey: 'device_id',
    header: 'Device ID',
    cell: (info) => <span className='font-mono text-xs'>{String(info.getValue() ?? '-')}</span>,
    enableSorting: true,
  },
  {
    accessorKey: 'token',
    header: 'Token',
    cell: (info) => (
      <span
        className='block max-w-[180px] truncate font-mono text-xs'
        title={String(info.getValue() ?? '-')}
      >
        {String(info.getValue() ?? '-')}
      </span>
    ),
    enableSorting: false,
  },
  {
    accessorKey: 'platform',
    header: 'Platform',
    cell: (info) => (
      <Badge variant='outline' className='capitalize'>
        {String(info.getValue() ?? '-')}
      </Badge>
    ),
    enableSorting: true,
  },
  {
    accessorKey: 'topics',
    header: 'Topics',
    cell: (info) => {
      const topics = info.getValue();
      let displayValue = '-';

      if (topics) {
        try {
          const parsed = typeof topics === 'string' ? JSON.parse(topics) : topics;
          if (parsed.audience) {
            displayValue = parsed.audience;
          } else if (Array.isArray(parsed.audiences)) {
            displayValue = parsed.audiences.join(', ');
          }
        } catch {
          displayValue = String(topics);
        }
      }

      return (
        <span className='text-xs' title={displayValue}>
          {displayValue.length > 20 ? `${displayValue.substring(0, 20)}...` : displayValue}
        </span>
      );
    },
    enableSorting: false,
  },
  {
    accessorKey: 'created_at',
    header: 'Created At',
    cell: (info) => {
      const date = info.getValue();
      if (!date) return <span className='text-xs'>-</span>;

      return (
        <span className='text-xs'>
          {new Date(date as string).toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      );
    },
    enableSorting: true,
  },
  {
    accessorKey: 'is_active',
    header: 'Active',
    cell: (info) => (
      <Badge variant={info.getValue() ? 'default' : 'secondary'}>
        {info.getValue() ? 'Yes' : 'No'}
      </Badge>
    ),
    enableSorting: true,
  },
  {
    id: 'actions',
    header: 'Thao tác',
    cell: ({ row }) => <FcmTokenRowActions token={row.original} />,
    meta: { className: 'w-48' },
    enableSorting: false,
  },
];
