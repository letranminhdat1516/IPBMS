import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

export default function Loading() {
  return (
    <div className={cn('flex flex-col items-center justify-center py-8')}>
      <Loader2 className={cn('text-primary mb-2 h-8 w-8 animate-spin')} />
      <span className={cn('text-muted-foreground')}>Đang tải dữ liệu...</span>
    </div>
  );
}
