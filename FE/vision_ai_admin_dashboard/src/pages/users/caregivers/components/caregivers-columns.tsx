import { Edit, Eye, Trash } from 'lucide-react';

import { ColumnDef } from '@tanstack/react-table';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

import { cn, maskEmail } from '@/lib/utils';

import type { Caregiver } from '@/types/user';

import { getInitials } from '@/utils/string';

const statusColors: Record<string, string> = {
  approved: 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20',
  pending: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20',
  rejected: 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20',
};

export const caregiversColumns: ColumnDef<Caregiver>[] = [
  {
    id: 'caregiver',
    accessorFn: (row) => {
      const parts = [row.full_name, row.user_id].filter(Boolean) as string[];
      return parts.join(' ');
    },
    header: () => <span>Người chăm sóc</span>,
    cell: ({ row }) => {
      const avatarUrl = row.original.avatar as string | undefined;
      const name = row.original.full_name as string | undefined;
      const userId = row.original.user_id?.toString().slice(-4) || 'xxxx';
      return (
        <div className='flex min-w-[220px] items-center gap-3'>
          <Avatar className='h-10 w-10 text-base'>
            {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
            <AvatarFallback>{name ? getInitials(name) : '?'}</AvatarFallback>
          </Avatar>
          <div className='flex flex-col'>
            <span className='font-semibold'>{name}</span>
            <span className='text-muted-foreground text-xs'>ID: {userId}</span>
          </div>
        </div>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'email',
    header: () => <span>Email</span>,
    cell: ({ row }) => {
      const email = row.original.email;
      const masked = maskEmail(email);
      return (
        <span title={email} className='text-muted-foreground font-mono text-sm'>
          {masked}
        </span>
      );
    },
    enableSorting: false,
  },
  {
    accessorKey: 'status',
    accessorFn: (row) => row.status,
    header: () => <span>Trạng thái</span>,
    cell: ({ row }) => {
      const status = row.original.status;
      const label =
        status === 'approved' ? 'Đã duyệt' : status === 'pending' ? 'Chờ duyệt' : 'Từ chối';
      return (
        <span className={cn('rounded-full px-3 py-1 text-sm font-semibold', statusColors[status])}>
          {label}
        </span>
      );
    },
    enableSorting: false,
  },
  {
    id: 'actions',
    header: () => <span>Hành động</span>,
    cell: ({ row, table }) => {
      const caregiver = row.original;
      const { setCurrentRow, setOpen } = table.options.meta as {
        setCurrentRow: (caregiver: Caregiver) => void;
        setOpen: (action: string) => void;
      };

      return (
        <div className='flex gap-1'>
          <Button
            variant='ghost'
            size='icon'
            onClick={(e) => {
              e.stopPropagation();
              setCurrentRow(caregiver);
              setOpen('edit');
            }}
          >
            <Edit className='h-4 w-4' />
          </Button>
          <Button variant='ghost' size='icon'>
            <Eye className='h-4 w-4' />
          </Button>
          <Button
            variant='ghost'
            size='icon'
            onClick={(e) => {
              e.stopPropagation();
              setCurrentRow(caregiver);
              setOpen('delete');
            }}
          >
            <Trash className='h-4 w-4' />
          </Button>
        </div>
      );
    },
    enableSorting: false,
  },
];
