import { Bell, CheckCircle, Clock, Shield } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AlertSummaryCardsProps {
  summary: {
    total: number;
    pending: number;
    critical: number;
    resolved: number;
  };
  isLoading: boolean;
}

export function AlertSummaryCards({ summary, isLoading }: AlertSummaryCardsProps) {
  return (
    <div className='mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
      <Card>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-sm font-medium'>Tổng Nhắc Nhở</CardTitle>
          <Bell className='text-muted-foreground h-4 w-4' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold'>{isLoading ? '...' : summary.total}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-sm font-medium'>Đang Chờ</CardTitle>
          <Clock className='text-muted-foreground h-4 w-4' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold'>{isLoading ? '...' : summary.pending}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-sm font-medium'>Nghiêm Trọng</CardTitle>
          <Shield className='text-muted-foreground h-4 w-4' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold'>{isLoading ? '...' : summary.critical}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-sm font-medium'>Đã Giải Quyết</CardTitle>
          <CheckCircle className='text-muted-foreground h-4 w-4' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold'>{isLoading ? '...' : summary.resolved}</div>
        </CardContent>
      </Card>
    </div>
  );
}
