import { Separator } from '@/components/ui/separator';

import { useCaregiverInvitations } from '@/services/caregiver-invitations';

interface Props {
  caregiverId: string | number;
}

export function CaregiverAssignedPatients({ caregiverId }: Props) {
  const {
    data: caregiverInvitations,
    isLoading,
    isError,
  } = useCaregiverInvitations({ caregiver_id: String(caregiverId) });

  if (isLoading) {
    return <div className='text-muted-foreground text-sm'>Đang tải…</div>;
  }
  if (isError) {
    return <div className='text-sm text-red-600'>Không tải được danh sách.</div>;
  }
  if (caregiverInvitations && caregiverInvitations.length > 0) {
    return (
      <>
        <Separator className='my-6' />
        <div className='text-muted-foreground mb-2 text-xs'>Danh sách bệnh nhân đã được gán</div>
        <ul className='space-y-2'>
          {caregiverInvitations.map((a) => (
            <li
              key={a.assignment_id}
              className='flex items-center justify-between rounded border px-3 py-2'
            >
              <div>
                <span className='font-semibold'>Mã BN:</span> {a.patient_id}
                {a.assignment_notes && (
                  <span className='text-muted-foreground ml-2 text-xs'>({a.assignment_notes})</span>
                )}
              </div>
              <span className='text-muted-foreground text-xs'>
                Gán lúc: {new Date(a.assigned_at).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      </>
    );
  }
  return (
    <>
      <Separator className='my-6' />
      <div className='text-muted-foreground mb-2 text-xs'>Danh sách bệnh nhân đã được gán</div>
      <div className='text-muted-foreground text-sm'>Chưa có bệnh nhân nào được gán.</div>
    </>
  );
}
