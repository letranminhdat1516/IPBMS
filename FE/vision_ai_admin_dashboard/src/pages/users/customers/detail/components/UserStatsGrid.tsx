import { Bell, Camera, HeartPulse, Info } from 'lucide-react';

import { Card } from '@/components/ui/card';

export interface UserStats {
  cameraActive: string;
  cameraNote: string;
  monitorTime: string;
  monitorNote: string;
  alertCount: string;
  alertNote: string;
  aiAccuracy: string;
  aiNote: string;
}

export function UserStatsGrid({ stats }: { stats: UserStats }) {
  return (
    <div className='mb-6 grid grid-cols-1 gap-4 md:grid-cols-4'>
      <Card className='flex flex-col gap-1 p-4'>
        <div className='text-muted-foreground mb-1 flex items-center gap-2 text-sm'>
          <Camera className='h-4 w-4' />
          Camera hoạt động
        </div>
        <div className='text-2xl font-bold text-green-600 dark:text-green-400'>
          {stats.cameraActive}
        </div>
        <div className='text-muted-foreground text-xs'>{stats.cameraNote}</div>
      </Card>
      <Card className='flex flex-col gap-1 p-4'>
        <div className='text-muted-foreground mb-1 flex items-center gap-2 text-sm'>
          <Info className='h-4 w-4' />
          Thời gian giám sát
        </div>
        <div className='text-2xl font-bold'>{stats.monitorTime}</div>
        <div className='text-muted-foreground text-xs'>{stats.monitorNote}</div>
      </Card>
      <Card className='flex flex-col gap-1 p-4'>
        <div className='text-muted-foreground mb-1 flex items-center gap-2 text-sm'>
          <Bell className='h-4 w-4' />
          Nhắc nhở hôm nay
        </div>
        <div className='text-2xl font-bold text-orange-600 dark:text-orange-400'>
          {stats.alertCount}
        </div>
        <div className='text-muted-foreground text-xs'>{stats.alertNote}</div>
      </Card>
      <Card className='flex flex-col gap-1 p-4'>
        <div className='text-muted-foreground mb-1 flex items-center gap-2 text-sm'>
          <HeartPulse className='h-4 w-4' />
          Độ tin cậy AI
        </div>
        <div className='text-2xl font-bold text-blue-600 dark:text-blue-400'>
          {stats.aiAccuracy}
        </div>
        <div className='text-muted-foreground text-xs'>{stats.aiNote}</div>
      </Card>
    </div>
  );
}
