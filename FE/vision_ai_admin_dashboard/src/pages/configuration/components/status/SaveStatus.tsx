import { CheckCircle2, XCircle } from 'lucide-react';

import { cn } from '@/lib/utils';

export function SaveStatus({ status }: { status: 'idle' | 'success' | 'error' }) {
  if (status === 'success')
    return (
      <span className={cn('ml-2 inline-flex items-center text-sm', 'text-green-600')}>
        <CheckCircle2 size={16} className='mr-1' />
        Đã lưu
      </span>
    );
  if (status === 'error')
    return (
      <span className={cn('ml-2 inline-flex items-center text-sm', 'text-red-600')}>
        <XCircle size={16} className='mr-1' />
        Lỗi
      </span>
    );
  return null;
}
