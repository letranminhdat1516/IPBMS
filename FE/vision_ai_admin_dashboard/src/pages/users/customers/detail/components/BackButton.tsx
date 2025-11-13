import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface BackButtonProps {
  onClick: () => void;
}

export function BackButton({ onClick }: BackButtonProps) {
  return (
    <div className='mt-10 flex justify-center'>
      <Button variant='outline' size='lg' className='flex items-center gap-2' onClick={onClick}>
        <ArrowLeft className='h-5 w-5' />
        Quay lại danh sách
      </Button>
    </div>
  );
}
