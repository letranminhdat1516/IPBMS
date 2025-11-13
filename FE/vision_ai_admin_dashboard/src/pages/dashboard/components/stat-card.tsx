import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import { cn } from '@/lib/utils';

type StatCardProps = {
  icon: React.ReactNode;
  title: string;
  value: number | string;
  changeText: string;
  trend?: 'up' | 'down' | 'neutral';
  isLoading?: boolean;
};

export function StatCard({
  icon,
  title,
  value,
  changeText,
  trend = 'neutral',
  isLoading = false,
}: StatCardProps) {
  const TrendIcon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : null;
  const trendColor =
    trend === 'up'
      ? 'text-emerald-600 dark:text-emerald-400'
      : trend === 'down'
        ? 'text-rose-600 dark:text-rose-400'
        : 'text-muted-foreground';

  if (isLoading) {
    return (
      <Card className={cn('gap-2 transition-shadow hover:shadow-sm')}>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <div className='flex items-center gap-2'>
            <Skeleton className='h-6 w-6 rounded-md' />
            <Skeleton className='h-4 w-32' />
          </div>
        </CardHeader>
        <CardContent>
          <div className='flex items-baseline gap-2'>
            <Skeleton className='h-8 w-16' />
            <Skeleton className='h-4 w-4' />
          </div>
          <Skeleton className='mt-1 h-3 w-24' />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('gap-2 transition-shadow hover:shadow-sm')}>
      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
        <CardTitle className='flex items-center gap-2 text-sm font-medium'>
          <span
            title={title}
            className='bg-muted text-muted-foreground inline-flex items-center justify-center rounded-md p-1.5'
          >
            {icon}
          </span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className='flex items-baseline gap-2'>
          <div className='text-primary text-3xl font-bold' title={title}>
            {value}
          </div>
          {TrendIcon && <TrendIcon className={cn('h-4 w-4', trendColor)} aria-hidden />}
        </div>
        <p className='text-muted-foreground mt-1 text-xs'>{changeText}</p>
      </CardContent>
    </Card>
  );
}
