import { useState } from 'react';

import { useQuery } from '@tanstack/react-query';

import { Badge } from '@/components/ui/badge';
import Pagination from '@/components/ui/pagination';

import { maskEmail, maskPhoneNumber } from '@/lib/utils';

import { getRecentSales } from '@/services/dashboard';

type PaymentWithUser = {
  payment_id?: string;
  user_id?: string;
  amount?: number;
  currency?: string;
  status?: string;
  payment_method?: string;
  created_at?: string;
  updated_at?: string;
  description?: string;
  invoice_id?: string;
  subscription_id?: string;
  user?: {
    full_name?: string;
    email?: string;
    phone_number?: string;
  };
};

type RecentPaymentsListProps = { from: string; to: string; limit?: number };

export default function RecentPaymentsList({ from, to, limit = 5 }: RecentPaymentsListProps) {
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(limit ?? 5);

  const { data, isLoading, error } = useQuery({
    queryKey: ['recent-sales', from, to, page, pageSize],
    queryFn: () => getRecentSales({ from, to, page, limit: pageSize }),
    staleTime: 30_000,
  });

  if (isLoading) return <div className='text-muted-foreground text-sm'>Đang tải...</div>;

  if (error) {
    return (
      <div className='text-muted-foreground text-sm'>Không thể tải dữ liệu. Vui lòng thử lại.</div>
    );
  }

  const items = data?.items ?? [];

  if (!items.length)
    return (
      <div className='flex flex-col items-center justify-center py-8 text-center'>
        <div className='mb-2 text-2xl'>💳</div>
        <div className='text-muted-foreground text-sm'>Chưa có thanh toán gần đây</div>
      </div>
    );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'canceled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'past_due':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'trialing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Hoạt động';
      case 'paid':
        return 'Đã thanh toán';
      case 'canceled':
        return 'Đã hủy';
      case 'past_due':
        return 'Quá hạn';
      case 'trialing':
        return 'Dùng thử';
      default:
        return status;
    }
  };

  return (
    <div className='space-y-3'>
      {items.map((rawItem, idx) => {
        const item = (rawItem ?? {}) as Record<string, unknown>;

        const pick = <T = unknown,>(obj: Record<string, unknown>, ...keys: string[]): T | null => {
          for (const k of keys) {
            const v = obj[k];
            if (v !== undefined && v !== null) return v as T;
          }
          return null;
        };

        const paymentId = pick<string>(item, 'payment_id', 'id', 'paymentId');
        const userId = pick<string>(item, 'user_id', 'userId');
        const amount = pick<number>(item, 'amount', 'total') ?? 0;
        const currency = pick<string>(item, 'currency') ?? 'VND';
        const status = String(pick<string>(item, 'status', 'state', 'payment_status') ?? 'unknown');
        const paymentMethod = pick<string>(item, 'payment_method', 'method');
        const createdAt = pick<string>(item, 'created_at', 'date');
        const description = pick<string>(item, 'description');
        const invoiceId = pick<string>(item, 'invoice_id', 'invoiceId');

        try {
          return (
            <div
              key={paymentId ?? userId ?? idx}
              className='group border-border/50 bg-card/50 hover:border-border hover:bg-card hover:shadow-primary/5 relative overflow-hidden rounded-xl border backdrop-blur-sm transition-all duration-200 hover:shadow-md'
            >
              <div className='p-4'>
                {/* Header with amount and status */}
                <div className='mb-3 flex items-start justify-between'>
                  <div className='flex items-center gap-3'>
                    <div className='bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-lg'>
                      <span className='text-lg'>💳</span>
                    </div>
                    <div>
                      <div className='text-foreground text-lg font-semibold'>
                        {amount.toLocaleString('vi-VN')} {currency}
                      </div>
                      <div className='text-muted-foreground text-xs'>
                        {createdAt ? new Date(createdAt).toLocaleDateString('vi-VN') : 'N/A'}
                      </div>
                    </div>
                  </div>
                  <div className='flex flex-col items-end gap-1'>
                    <Badge className={`text-xs font-medium ${getStatusColor(status ?? 'unknown')}`}>
                      {getStatusLabel(status ?? 'unknown')}
                    </Badge>
                    {paymentMethod && (
                      <Badge variant='outline' className='text-xs'>
                        {paymentMethod}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* User info */}
                <div className='mb-3 space-y-2'>
                  <div className='flex items-center gap-2'>
                    <div className='bg-muted flex h-6 w-6 items-center justify-center rounded-full'>
                      <span className='text-xs'>👤</span>
                    </div>
                    <div className='min-w-0 flex-1'>
                      <div className='text-foreground text-sm font-medium'>
                        {(item as PaymentWithUser).user?.full_name ?? userId ?? 'N/A'}
                      </div>
                      <div className='space-y-0.5'>
                        {(item as PaymentWithUser).user?.email && (
                          <div className='text-muted-foreground flex items-center gap-1 text-xs'>
                            <span>📧</span>
                            <span className='truncate'>
                              {maskEmail((item as PaymentWithUser).user?.email)}
                            </span>
                          </div>
                        )}
                        {(item as PaymentWithUser).user?.phone_number && (
                          <div className='text-muted-foreground flex items-center gap-1 text-xs'>
                            <span>📱</span>
                            <span>
                              {maskPhoneNumber((item as PaymentWithUser).user?.phone_number)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Details grid */}
                <div className='grid grid-cols-2 gap-3 text-xs'>
                  <div className='space-y-1'>
                    <div className='text-muted-foreground'>Mã thanh toán</div>
                    <div className='text-foreground font-mono'>
                      {paymentId ? String(paymentId).slice(0, 8) + '...' : 'N/A'}
                    </div>
                  </div>
                  {invoiceId && (
                    <div className='space-y-1'>
                      <div className='text-muted-foreground'>Hóa đơn</div>
                      <div className='text-foreground font-mono'>
                        {String(invoiceId).slice(0, 8)}...
                      </div>
                    </div>
                  )}
                </div>

                {/* Description */}
                {description && (
                  <div className='bg-muted/50 mt-3 rounded-md p-2'>
                    <div className='text-muted-foreground mb-1 text-xs'>Mô tả</div>
                    <div className='text-foreground text-xs'>{description}</div>
                  </div>
                )}
              </div>

              {/* Subtle gradient overlay on hover */}
              <div className='from-primary/5 to-primary/5 pointer-events-none absolute inset-0 bg-gradient-to-br via-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100' />
            </div>
          );
        } catch (_renderError) {
          return (
            <div
              key={paymentId ?? userId ?? idx}
              className='border-destructive/20 bg-destructive/5 text-destructive rounded-xl border p-4 text-xs'
            >
              <div className='flex items-center gap-2'>
                <span>⚠️</span>
                <span>Lỗi hiển thị thanh toán</span>
              </div>
            </div>
          );
        }
      })}
      {data?.pagination ? (
        <Pagination
          page={(data.pagination.page as number) ?? page}
          total={(data.pagination.total as number) ?? items.length}
          limit={pageSize}
          onPageChange={(p) => {
            setPage(p);
          }}
          onLimitChange={(l) => {
            setPageSize(l);
            setPage(1);
          }}
        />
      ) : (
        <div className='text-muted-foreground border-t pt-2 text-center text-xs'>
          Hiển thị {Math.min(pageSize, items.length)} / {items.length} thanh toán
        </div>
      )}
    </div>
  );
}
