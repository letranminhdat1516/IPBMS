import { Button } from '@/components/ui/button';

import type { FcmToken } from '@/types/fcm-token';

import { useFcmTokensContext } from '../context/fcm-tokens-context';

interface FcmTokenRowActionsProps {
  token: FcmToken;
}

export function FcmTokenRowActions({ token }: FcmTokenRowActionsProps) {
  const { setCurrentRow, setOpen, patchTokenStatus, setDeleteTokenIds } = useFcmTokensContext();

  const handleEdit = () => {
    setCurrentRow(token);
    setOpen('edit');
  };

  const handleToggleActive = () => {
    patchTokenStatus(token.id, !token.active);
  };

  const handleDelete = () => {
    setDeleteTokenIds([token.id]);
    setOpen('delete');
  };

  return (
    <div className='flex gap-2'>
      <Button size='sm' variant='outline' onClick={handleEdit}>
        Sửa
      </Button>
      <Button size='sm' variant='outline' onClick={handleToggleActive}>
        {token.active ? 'Deactivate' : 'Activate'}
      </Button>
      <Button size='sm' variant='destructive' onClick={handleDelete}>
        Xoá
      </Button>
    </div>
  );
}
