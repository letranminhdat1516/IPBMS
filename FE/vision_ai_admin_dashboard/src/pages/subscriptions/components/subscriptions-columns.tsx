import {
  AlertCircle,
  Calendar,
  CheckCircle,
  CreditCard,
  Edit,
  Eye,
  Package,
  XCircle,
} from 'lucide-react';

import { Link } from '@tanstack/react-router';
import { ColumnDef } from '@tanstack/react-table';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { cn, maskId } from '@/lib/utils';

import type { Subscription } from '@/types/subscription';

const statusColors: Record<string, string> = {
  active: 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20',
  inactive: 'bg-muted text-muted-foreground border border-border',
  cancelled: 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20',
  expired: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20',
};

const statusIcons: Record<string, React.ReactNode> = {
  active: <CheckCircle className='h-3 w-3' />,
  inactive: <XCircle className='h-3 w-3' />,
  cancelled: <XCircle className='h-3 w-3' />,
  expired: <AlertCircle className='h-3 w-3' />,
};

export const columns: ColumnDef<Subscription>[] = [
  {
    id: 'plan',
    accessorFn: (row) => row.plans?.name || 'N/A',
    header: () => (
      <div className='flex items-center gap-2'>
        <Package className='h-4 w-4' />
        <span>Gói dịch vụ</span>
      </div>
    ),
    cell: ({ row }) => {
      const subscription = row.original;
      return (
        <div className='flex min-w-[200px] items-center gap-3'>
          <Avatar className='h-10 w-10'>
            <AvatarFallback className='bg-primary/10 text-primary font-semibold'>
              {subscription.plans?.name?.charAt(0) || 'N'}
            </AvatarFallback>
          </Avatar>
          <div className='flex flex-col'>
            <span className='text-sm font-semibold'>{subscription.plans?.name || 'N/A'}</span>
            <div className='text-muted-foreground flex items-center gap-2 text-xs'>
              <span>ID: {maskId(subscription.subscription_id)}</span>
            </div>
          </div>
        </div>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  // {
  //   id: 'user',
  //   accessorFn: (row) => row.user?.full_name || row.user?.username || row.user_id,
  //   header: () => (
  //     <div className='flex items-center gap-2'>
  //       <User className='h-4 w-4' />
  //       <span>Người dùng</span>
  //     </div>
  //   ),
  //   cell: ({ row }) => {
  //     const subscription = row.original;
  //     const user = subscription.user;

  //     return (
  //       <div className='flex min-w-[180px] items-center gap-3'>
  //         <Avatar className='h-8 w-8'>
  //           <AvatarFallback className='bg-secondary text-secondary-foreground text-xs font-semibold'>
  //             {user?.full_name
  //               ? user.full_name
  //                   .split(' ')
  //                   .map((n) => n[0])
  //                   .join('')
  //                   .toUpperCase()
  //                   .slice(0, 2)
  //               : subscription.user_id.toString().slice(-2).toUpperCase()}
  //           </AvatarFallback>
  //         </Avatar>
  //         <div className='flex flex-col'>
  //           <span className='text-sm font-medium'>
  //             {user?.full_name
  //               ? maskName(user.full_name)
  //               : user?.username
  //                 ? maskName(user.username)
  //                 : 'Không có tên'}
  //           </span>
  //           <div className='text-muted-foreground flex items-center gap-2 text-xs'>
  //             <span>ID: {maskId(subscription.user_id.toString())}</span>
  //             {user?.email && <span className='max-w-32 truncate'>• {maskEmail(user.email)}</span>}
  //           </div>
  //         </div>
  //       </div>
  //     );
  //   },
  //   enableSorting: false,
  //   enableHiding: false,
  // },
  {
    accessorKey: 'status',
    header: () => (
      <div className='flex items-center gap-2'>
        <CheckCircle className='h-4 w-4' />
        <span>Trạng thái</span>
      </div>
    ),
    cell: ({ row }) => {
      const status = row.getValue('status') as string;
      return (
        <Badge
          variant='outline'
          className={cn(
            'flex items-center gap-1 capitalize',
            statusColors[status] || statusColors.inactive
          )}
        >
          {statusIcons[status]}
          {status === 'active'
            ? 'Hoạt động'
            : status === 'inactive'
              ? 'Không hoạt động'
              : status === 'cancelled'
                ? 'Đã hủy'
                : status === 'expired'
                  ? 'Đã hết hạn'
                  : status}
        </Badge>
      );
    },
  },
  // {
  //   accessorKey: 'billing_period',
  //   header: () => (
  //     <div className='flex items-center gap-2'>
  //       <Clock className='h-4 w-4' />
  //       <span>Chu kỳ</span>
  //     </div>
  //   ),
  //   cell: ({ row }) => {
  //     const billingPeriod = row.getValue('billing_period') as string;
  //     const _billingPeriod =
  //       billingPeriod === 'monthly'
  //         ? 'Một Tháng'
  //         : billingPeriod === 'yearly'
  //           ? 'Một Năm'
  //           : billingPeriod === 'none'
  //             ? 'Một lần'
  //             : billingPeriod;
  //     const isMonthly = billingPeriod === 'monthly';
  //     return (
  //       <Badge variant={isMonthly ? 'default' : 'secondary'} className='capitalize'>
  //         {_billingPeriod}
  //       </Badge>
  //     );
  //   },
  // },
  {
    accessorKey: 'started_at',
    header: () => (
      <div className='flex items-center gap-2'>
        <Calendar className='h-4 w-4' />
        <span>Ngày bắt đầu</span>
      </div>
    ),
    cell: ({ row }) => {
      const date = row.getValue('started_at') as string;
      return (
        <div className='flex flex-col'>
          <span className='text-sm font-medium'>{new Date(date).toLocaleDateString('vi-VN')}</span>
          <span className='text-muted-foreground text-xs'>
            {new Date(date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: 'current_period_end',
    header: () => (
      <div className='flex items-center gap-2'>
        <Calendar className='h-4 w-4' />
        <span>Ngày kết thúc</span>
      </div>
    ),
    cell: ({ row }) => {
      const date = row.getValue('current_period_end') as string | null;
      if (!date) {
        return (
          <Badge variant='outline' className='text-muted-foreground'>
            Không giới hạn
          </Badge>
        );
      }
      return (
        <div className='flex flex-col'>
          <span className='text-sm font-medium'>{new Date(date).toLocaleDateString('vi-VN')}</span>
          <span className='text-muted-foreground text-xs'>
            {new Date(date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      );
    },
  },
  // {
  //   accessorKey: 'auto_renew',
  //   header: () => <span>Tự động gia hạn</span>,
  //   cell: ({ row }) => {
  //     const autoRenew = row.getValue('auto_renew') as boolean;
  //     return (
  //       <div className='flex items-center gap-2'>
  //         {autoRenew ? (
  //           <CheckCircle className='h-4 w-4 text-green-600' />
  //         ) : (
  //           <XCircle className='text-muted-foreground h-4 w-4' />
  //         )}
  //         <span className='text-sm'>{autoRenew ? 'Có' : 'Không'}</span>
  //       </div>
  //     );
  //   },
  //   filterFn: (row, id, value) => {
  //     const cellValue = row.getValue(id) as boolean;
  //     return value.includes(cellValue);
  //   },
  // },
  {
    accessorKey: 'last_payment_at',
    header: () => (
      <div className='flex items-center gap-2'>
        <CreditCard className='h-4 w-4' />
        <span>Thanh toán cuối</span>
      </div>
    ),
    cell: ({ row }) => {
      const date = row.getValue('last_payment_at') as string | null;
      if (!date) {
        return <span className='text-muted-foreground text-sm italic'>Chưa thanh toán</span>;
      }
      return (
        <div className='flex flex-col'>
          <span className='text-sm font-medium'>{new Date(date).toLocaleDateString('vi-VN')}</span>
          <span className='text-muted-foreground text-xs'>
            {new Date(date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      );
    },
  },
  {
    id: 'actions',
    header: () => <span className='sr-only'>Hành động</span>,
    cell: ({ row: _row }) => {
      return (
        <div className='flex items-center gap-1'>
          <Link
            to='/subscriptions/$subscriptionId'
            params={{ subscriptionId: _row.original.subscription_id }}
          >
            <Button variant='ghost' size='sm' className='hover:bg-muted h-8 w-8 p-0'>
              <Eye className='h-4 w-4' />
              <span className='sr-only'>Xem chi tiết</span>
            </Button>
          </Link>
          <Button
            variant='ghost'
            size='sm'
            className='hover:bg-muted h-8 w-8 p-0'
            onClick={(e) => {
              e.stopPropagation();
              // Handle edit action
            }}
          >
            <Edit className='h-4 w-4' />
            <span className='sr-only'>Chỉnh sửa</span>
          </Button>
        </div>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
];
