import { CheckCircle2, ShieldAlert, UserCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';

import { Caregiver } from '@/types/user';

import { updateCaregiver } from '@/services/caregivers';

interface Props {
  caregiver: Caregiver;
  onEdit: (row: Caregiver) => void;
  onDelete: (row: Caregiver) => void;
}

export function CaregiverActionsCell({ caregiver, onEdit, onDelete }: Props) {
  const queryClient = useQueryClient();
  const approveMutation = useMutation({
    mutationFn: async () => {
      await updateCaregiver(caregiver.user_id, { status: 'approved' });
    },
    onSuccess: () => {
      // Invalidate caregiver list so UI refreshes
      queryClient.invalidateQueries({ queryKey: ['caregivers'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Đã duyệt caregiver!');
    },
    onError: () => toast.error('Duyệt caregiver thất bại!'),
  });
  const rejectMutation = useMutation({
    mutationFn: async () => {
      await updateCaregiver(caregiver.user_id, { status: 'rejected' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caregivers'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Đã từ chối caregiver!');
    },
    onError: () => toast.error('Từ chối caregiver thất bại!'),
  });
  return (
    <div className='flex gap-1'>
      <Button
        variant='ghost'
        size='icon'
        title='Duyệt'
        onClick={() => approveMutation.mutate()}
        disabled={approveMutation.status === 'pending'}
      >
        <CheckCircle2 className='h-4 w-4' />
      </Button>
      <Button
        variant='ghost'
        size='icon'
        title='Từ chối'
        onClick={() => rejectMutation.mutate()}
        disabled={rejectMutation.status === 'pending'}
      >
        <ShieldAlert className='h-4 w-4' />
      </Button>
      <Button variant='ghost' size='icon' title='Sửa' onClick={() => onEdit(caregiver)}>
        <UserCircle2 className='h-4 w-4' />
      </Button>
      <Button variant='ghost' size='icon' title='Xoá' onClick={() => onDelete(caregiver)}>
        <XCircle className='h-4 w-4' />
      </Button>
    </div>
  );
}
