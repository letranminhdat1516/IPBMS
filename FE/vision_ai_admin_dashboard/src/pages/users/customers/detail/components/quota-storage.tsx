import { HardDrive } from 'lucide-react';

import { Progress } from '@/components/ui/progress';

type QuotaStorageProps = {
  usedGb?: number;
  maxGb?: number;
  percent?: number;
};

export default function QuotaStorage({ usedGb = 0, maxGb = 0, percent = 0 }: QuotaStorageProps) {
  return (
    <div className='bg-card mt-6 rounded-lg border p-4'>
      <div className='mb-2 flex items-center justify-between'>
        <div className='flex items-center space-x-2'>
          <HardDrive className='h-4 w-4 text-red-600' />
          <span className='text-sm font-medium'>Storage Usage</span>
        </div>
        <span className='text-muted-foreground text-sm'>
          {usedGb} GB / {maxGb} GB
        </span>
      </div>
      <Progress value={Math.min(100, Math.max(0, percent))} className='h-2' />
      <p className='text-muted-foreground mt-1 text-xs'>{percent}% used</p>
    </div>
  );
}
