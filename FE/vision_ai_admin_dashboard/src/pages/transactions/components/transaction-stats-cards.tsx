import { CreditCard, DollarSign, TrendingUp } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { TransactionStats } from '@/types/transaction';

interface TransactionStatsCardsProps {
  stats?: TransactionStats;
  isLoading: boolean;
}

/**
 * Component hiển thị các thẻ thống kê giao dịch
 */
export function TransactionStatsCards({ stats, isLoading }: TransactionStatsCardsProps) {
  if (isLoading) {
    return (
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <div className='bg-muted h-4 w-24 animate-pulse rounded' />
              <div className='bg-muted h-4 w-4 animate-pulse rounded' />
            </CardHeader>
            <CardContent>
              <div className='bg-muted mb-1 h-8 w-16 animate-pulse rounded' />
              <div className='bg-muted h-3 w-20 animate-pulse rounded' />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const cards = [
    {
      title: 'Tổng giao dịch',
      value: stats.total_transactions.toLocaleString(),
      description: 'Tất cả giao dịch',
      icon: CreditCard,
      color: 'text-blue-600',
    },
    {
      title: 'Tổng doanh thu',
      value: formatCurrency(stats.total_amount),
      description: 'Doanh thu thực tế',
      icon: DollarSign,
      color: 'text-green-600',
    },
    {
      title: 'Giao dịch thành công',
      value: stats.successful_transactions.toLocaleString(),
      description: `${((stats.successful_transactions / stats.total_transactions) * 100).toFixed(1)}% tỷ lệ thành công`,
      icon: TrendingUp,
      color: 'text-emerald-600',
    },
  ];

  return (
    <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
      {cards.map((card, index) => (
        <Card key={index}>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>{card.title}</CardTitle>
            <card.icon className={`h-4 w-4 ${card.color}`} />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{card.value}</div>
            <p className='text-muted-foreground text-xs'>{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
