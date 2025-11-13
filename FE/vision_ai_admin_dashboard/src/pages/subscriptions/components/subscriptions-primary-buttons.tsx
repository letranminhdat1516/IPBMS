import { IconPlus } from '@tabler/icons-react';

import { Button } from '@/components/ui/button';

import { useSubscriptionsContext } from '../hooks/use-subscriptions-context';

export function SubscriptionsPrimaryButtons() {
  const { setIsCreateDialogOpen } = useSubscriptionsContext();
  return (
    <div className='flex gap-2'>
      <Button className='space-x-1' onClick={() => setIsCreateDialogOpen(true)}>
        <span>Thêm gói đăng ký</span> <IconPlus size={18} />
      </Button>
    </div>
  );
}
