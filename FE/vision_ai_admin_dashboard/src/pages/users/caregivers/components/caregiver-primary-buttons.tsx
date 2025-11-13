import { IconUserPlus } from '@tabler/icons-react';

import { Button } from '@/components/ui/button';

import { useCaregivers } from '../context/caregiver-context';

export function CaregiverPrimaryButtons() {
  const { setOpen } = useCaregivers();
  return (
    <div className='flex gap-2'>
      {/* <Button variant='outline' className='space-x-1' onClick={() => setOpen('invite')}>
        <span>Mời người dùng</span> <IconMailPlus size={18} />
      </Button> */}
      <Button className='space-x-1' onClick={() => setOpen('add')}>
        <span>Thêm người dùng</span> <IconUserPlus size={18} />
      </Button>
    </div>
  );
}
