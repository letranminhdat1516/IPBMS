import { Edit, Eye, Trash } from 'lucide-react';

import { ColumnDef } from '@tanstack/react-table';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

import { cn, maskEmail } from '@/lib/utils';

import { getInitials } from '@/utils/string';

import type { User } from '../data/schema';

const statusColors: Record<string, string> = {
  active: 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20',
  inactive: 'bg-muted text-muted-foreground border border-border',
};

export const columns: ColumnDef<User>[] = [
  {
    id: 'username',
    accessorFn: (row) => {
      const parts = [row.username, row.user_id].filter(Boolean) as string[];
      return parts.join(' ');
    },
    header: () => <span>Khách hàng</span>,
    cell: ({ row }) => {
      const avatarUrl = row.original.avatar as string | undefined;
      const name = row.original.username as string | undefined;
      const userId = row.original.user_id?.toString().slice(-4) || 'xxxx';
      // 2 dòng: tên, ID
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
    header: () => <span className='hidden md:table-cell'>Email</span>,
    cell: ({ row }) => {
      const email = row.original.email;
      if (!email) return <span className='text-muted-foreground'>-</span>;

      const masked = maskEmail(email);
      return (
        <span title={email} className='text-muted-foreground hidden font-mono text-sm md:inline'>
          {masked}
        </span>
      );
    },
    enableSorting: false,
  },
  // {
  //   accessorKey: 'phone_number',
  //   header: () => <span>Số điện thoại</span>,
  //   cell: ({ row }) => {
  //     const phone = row.original.phone_number;
  //     if (!phone) return <span className='text-muted-foreground'>-</span>;

  //     return <span className='font-mono text-sm'>{maskPhoneNumber(phone)}</span>;
  //   },
  //   enableSorting: false,
  // },
  {
    accessorKey: 'status',
    accessorFn: (row) => (row.is_active ? 'active' : 'inactive'),
    header: () => <span>Trạng thái</span>,
    cell: ({ row }) => {
      const isActive = row.original.is_active;
      const status = isActive ? 'active' : 'inactive';
      const label = isActive ? 'Hoạt động' : 'Không hoạt động';
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
      const user = row.original;
      const { setCurrentRow, setOpen } = table.options.meta as {
        setCurrentRow: (user: User) => void;
        setOpen: (action: string) => void;
      };

      return (
        <div className='flex gap-1'>
          <Button
            variant='ghost'
            size='icon'
            onClick={(e) => {
              e.stopPropagation();
              setCurrentRow(user);
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
              setCurrentRow(user);
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
