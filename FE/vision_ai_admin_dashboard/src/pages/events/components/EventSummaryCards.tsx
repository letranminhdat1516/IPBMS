import { AlertTriangle, Camera, Eye, Shield } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { type EventItem } from '@/services/events';

interface EventSummaryCardsProps {
  events: EventItem[];
  total: number;
}

export function EventSummaryCards({ events, total }: EventSummaryCardsProps) {
  const fallEventsToday = events.filter(
    (e) =>
      e.event_type.includes('fall') &&
      new Date(e.detected_at).toDateString() === new Date().toDateString()
  ).length;

  const criticalEvents = events.filter(
    (e) => e.severity === 'high' || e.severity === 'critical'
  ).length;

  const activeCameras = new Set(events.map((e) => e.camera_id)).size;

  return (
    <div className='mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
      <Card>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-sm font-medium'>Té ngã hôm nay</CardTitle>
          <AlertTriangle className='text-muted-foreground h-4 w-4' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold'>{fallEventsToday}</div>
          <p className='text-muted-foreground text-xs'>Sự kiện phát hiện té ngã</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-sm font-medium'>Vấn đề sức khỏe</CardTitle>
          <Shield className='text-muted-foreground h-4 w-4' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold'>{criticalEvents}</div>
          <p className='text-muted-foreground text-xs'>Sự kiện nghiêm trọng</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-sm font-medium'>Camera hoạt động</CardTitle>
          <Camera className='text-muted-foreground h-4 w-4' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold'>{activeCameras}</div>
          <p className='text-muted-foreground text-xs'>Camera đang gửi sự kiện</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-sm font-medium'>Tổng sự kiện</CardTitle>
          <Eye className='text-muted-foreground h-4 w-4' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold'>{total}</div>
          <p className='text-muted-foreground text-xs'>Sự kiện trong hệ thống</p>
        </CardContent>
      </Card>
    </div>
  );
}
