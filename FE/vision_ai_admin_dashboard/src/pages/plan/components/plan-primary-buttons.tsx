import { IconPackage } from '@tabler/icons-react';

import { Button } from '@/components/ui/button';

import { usePlan } from '../context/plan-context';

export function PlanPrimaryButtons() {
  const { setOpen } = usePlan();
  return (
    <div className='flex gap-2'>
      <Button className='space-x-1' onClick={() => setOpen('add')}>
        <span>Thêm gói dịch vụ</span> <IconPackage size={18} />
      </Button>
    </div>
  );
}
