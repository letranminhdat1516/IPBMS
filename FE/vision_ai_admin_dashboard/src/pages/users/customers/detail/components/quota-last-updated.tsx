import { Calendar, CheckCircle } from 'lucide-react';

type QuotaLastUpdatedProps = {
  updatedAt?: string | number | null;
};

export default function QuotaLastUpdated({ updatedAt }: QuotaLastUpdatedProps) {
  if (!updatedAt) return null;
  const date = new Date(String(updatedAt)).toLocaleString('vi-VN');
  return (
    <div className='flex items-center justify-between border-t pt-4'>
      <div className='flex items-center space-x-2'>
        <Calendar className='text-muted-foreground h-4 w-4' />
        <span className='text-muted-foreground text-sm'>Cập nhật lần cuối</span>
      </div>
      <div className='flex items-center space-x-2'>
        <CheckCircle className='h-4 w-4 text-green-600' />
        <span className='text-sm font-medium'>{date}</span>
      </div>
    </div>
  );
}
