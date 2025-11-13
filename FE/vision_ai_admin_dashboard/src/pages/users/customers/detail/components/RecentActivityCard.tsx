import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

export interface RecentActivity {
  type: string;
  description: string;
  time: string;
  location: string;
  status: 'normal' | 'attention' | 'emergency';
}

export function RecentActivityCard({ activities }: { activities: RecentActivity[] }) {
  const getColor = (status: RecentActivity['status']) => {
    switch (status) {
      case 'normal':
        return 'bg-green-500';
      case 'attention':
        return 'bg-yellow-400';
      case 'emergency':
        return 'bg-red-500';
      default:
        return 'bg-gray-300';
    }
  };
  const getBadge = (status: RecentActivity['status']) => {
    switch (status) {
      case 'normal':
        return <Badge variant='outline'>Bình thường</Badge>;
      case 'attention':
        return <Badge variant='secondary'>Chú ý</Badge>;
      case 'emergency':
        return <Badge variant='destructive'>Khẩn cấp</Badge>;
      default:
        return <Badge variant='secondary'>Khác</Badge>;
    }
  };
  return (
    <Card className='p-6'>
      <div className='mb-1 text-lg font-bold'>Hoạt động gần đây</div>
      <div className='text-muted-foreground mb-2 text-xs'>
        Các hành vi được phát hiện trong 24h qua
      </div>
      <ul className='space-y-2'>
        {activities.map((act, idx) => (
          <li key={idx} className='flex items-center gap-2'>
            <span className={`inline-block h-2 w-2 rounded-full ${getColor(act.status)}`}></span>
            {act.description}{' '}
            <span className='text-muted-foreground ml-auto text-xs'>
              {act.time} - {act.location}
            </span>{' '}
            {getBadge(act.status)}
          </li>
        ))}
      </ul>
    </Card>
  );
}
