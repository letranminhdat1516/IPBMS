import { IconPackage } from '@tabler/icons-react';

import { Button } from '@/components/ui/button';

import { useFcmTokensContext } from '../context/fcm-tokens-context';

export function FCMTokensPrimaryButtons() {
  const { setOpen } = useFcmTokensContext();
  return (
    <div className='flex gap-2'>
      <Button className='space-x-1' onClick={() => setOpen('add')}>
        <span>Thêm</span> <IconPackage size={18} />
      </Button>
    </div>
  );
}
