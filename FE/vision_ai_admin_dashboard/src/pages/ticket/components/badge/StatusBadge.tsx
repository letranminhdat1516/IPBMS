import { AlertTriangle, ArrowRight, ArrowUp, CheckCircle, Clock, XCircle } from 'lucide-react';

import { cn } from '@/lib/utils';

export function StatusBadge({ status }: { status: string }) {
  const getStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case 'hoạt động':
      case 'online':
        return {
          icon: ArrowUp,
          className: 'bg-green-500/10 text-green-600 dark:text-green-400',
          label: 'Hoạt động',
        };
      case 'không hoạt động':
      case 'offline':
        return {
          icon: ArrowRight,
          className: 'bg-red-500/10 text-red-600 dark:text-red-400',
          label: 'Không hoạt động',
        };
      case 'done':
      case 'hoàn thành':
        return {
          icon: CheckCircle,
          className: 'bg-green-500/10 text-green-600 dark:text-green-400',
          label: 'Hoàn thành',
        };
      case 'block':
      case 'bị chặn':
        return {
          icon: XCircle,
          className: 'bg-red-500/10 text-red-600 dark:text-red-400',
          label: 'Bị chặn',
        };
      case 'not':
      case 'chưa xử lý':
        return {
          icon: Clock,
          className: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
          label: 'Chưa xử lý',
        };
      case 'is':
      case 'đang xử lý':
        return {
          icon: AlertTriangle,
          className: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
          label: 'Đang xử lý',
        };
      default:
        return {
          icon: ArrowRight,
          className: 'bg-muted text-muted-foreground',
          label: status,
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold',
        config.className
      )}
    >
      <Icon size={14} />
      {config.label}
    </span>
  );
}

// Component riêng cho trạng thái ticket
export function TicketStatusBadge({ status }: { status: string }) {
  const getTicketStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case 'done':
      case 'hoàn thành':
        return {
          icon: CheckCircle,
          className: 'bg-green-500/10 text-green-700 dark:text-green-400 border border-green-200',
          label: '✅ Hoàn thành',
        };
      case 'block':
      case 'bị chặn':
        return {
          icon: XCircle,
          className: 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200',
          label: '🚫 Bị chặn',
        };
      case 'not':
      case 'chưa xử lý':
        return {
          icon: Clock,
          className: 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border border-gray-200',
          label: '⏳ Chưa xử lý',
        };
      case 'is':
      case 'đang xử lý':
        return {
          icon: AlertTriangle,
          className:
            'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border border-yellow-200',
          label: '🔄 Đang xử lý',
        };
      default:
        return {
          icon: Clock,
          className: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border border-gray-200',
          label: '❓ Chưa xác định',
        };
    }
  };

  const config = getTicketStatusConfig(status);
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold',
        config.className
      )}
    >
      <Icon size={12} />
      {config.label}
    </span>
  );
}
