import { CheckCircle2, Edit, Trash, XCircle } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';

import type { CaregiverInvitation } from '@/services/caregiver-invitations';
import {
  useAcceptCaregiverInvitation,
  useRejectCaregiverInvitation,
} from '@/services/caregiver-invitations';

interface Props {
  invitation: CaregiverInvitation;
  onEdit: (invitation: CaregiverInvitation) => void;
  onDelete: (invitation: CaregiverInvitation) => void;
}

export function CaregiverInvitationActionsCell({ invitation, onEdit, onDelete }: Props) {
  const acceptMutation = useAcceptCaregiverInvitation();
  const rejectMutation = useRejectCaregiverInvitation();

  const isPending = !invitation.is_active && !invitation.unassigned_at;

  const handleAccept = async () => {
    try {
      await acceptMutation.mutateAsync({ assignment_id: invitation.assignment_id });
      toast.success('Đã chấp nhận phân công');
    } catch (_error) {
      toast.error('Chấp nhận phân công thất bại');
    }
  };

  const handleReject = async () => {
    try {
      await rejectMutation.mutateAsync({ assignment_id: invitation.assignment_id });
      toast.success('Đã từ chối phân công');
    } catch (_error) {
      toast.error('Từ chối phân công thất bại');
    }
  };

  return (
    <div className='flex gap-1'>
      {isPending && (
        <>
          <Button
            variant='ghost'
            size='icon'
            title='Chấp nhận'
            onClick={(e) => {
              e.stopPropagation();
              handleAccept();
            }}
            disabled={acceptMutation.isPending}
          >
            <CheckCircle2 className='h-4 w-4' />
          </Button>
          <Button
            variant='ghost'
            size='icon'
            title='Từ chối'
            onClick={(e) => {
              e.stopPropagation();
              handleReject();
            }}
            disabled={rejectMutation.isPending}
          >
            <XCircle className='h-4 w-4' />
          </Button>
        </>
      )}

      <Button
        variant='ghost'
        size='icon'
        onClick={(e) => {
          e.stopPropagation();
          onEdit(invitation);
        }}
      >
        <Edit className='h-4 w-4' />
      </Button>
      <Button
        variant='ghost'
        size='icon'
        onClick={(e) => {
          e.stopPropagation();
          onDelete(invitation);
        }}
      >
        <Trash className='h-4 w-4' />
      </Button>
    </div>
  );
}
