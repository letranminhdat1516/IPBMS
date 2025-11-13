import { formatDateVN } from '@/utils';
import { Calendar, User, Users } from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

import { maskEmail, maskName, maskPhoneNumber, normalizePhoneTo84 } from '@/lib/utils';

import type { Caregiver } from '@/types/user';

import type { CaregiverInvitation } from '@/services/caregiver-invitations';

interface MedicalInfoProps {
  medical: {
    patient: {
      name: string;
      id: string;
      dob?: string | null;
    } | null;
  };
  assignments: CaregiverInvitation[];
  caregivers: Caregiver[];
  isAssignmentsLoading: boolean;
  isAssignmentsError: boolean;
  setConfirmUnassign: (data: { caregiver_id: string }) => void;
}

export default function MedicalInfo({
  medical,
  assignments,
  caregivers,
  isAssignmentsLoading,
  isAssignmentsError,
  setConfirmUnassign,
}: MedicalInfoProps) {
  if (!medical.patient) {
    return <div className='text-muted-foreground text-sm'>Chưa có thông tin bệnh nhân.</div>;
  }
  return (
    <Card className='overflow-hidden shadow-sm transition-shadow hover:shadow-md'>
      <CardContent className='p-6'>
        {/* Header với tên và ngày sinh */}
        <div className='mb-4 flex items-start gap-4'>
          <Avatar className='h-12 w-12 bg-gradient-to-br from-blue-500 to-purple-600'>
            <AvatarFallback className='bg-transparent font-semibold text-white'>
              {medical.patient.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className='min-w-0 flex-1'>
            <div className='mb-2 flex items-center gap-3'>
              <User className='text-muted-foreground h-4 w-4' />
              <h3 className='truncate text-lg font-bold'>{medical.patient.name}</h3>
            </div>
            <div className='mb-2 flex items-center gap-3'>
              <Calendar className='text-muted-foreground h-4 w-4' />
              <Badge variant='secondary' className='text-xs'>
                {medical.patient.dob
                  ? formatDateVN(new Date(medical.patient.dob))
                  : 'Không rõ ngày sinh'}
              </Badge>
            </div>
            <p className='text-muted-foreground text-xs'>ID: {medical.patient.id}</p>
          </div>
        </div>

        <Separator className='my-4' />

        {/* Người chăm sóc */}
        <div className='space-y-3'>
          <div className='flex items-center gap-2'>
            <Users className='text-muted-foreground h-4 w-4' />
            <h4 className='text-sm font-semibold'>Người chăm sóc</h4>
          </div>

          {isAssignmentsLoading ? (
            <div className='text-muted-foreground text-xs'>Đang tải...</div>
          ) : isAssignmentsError ? (
            <div className='text-destructive text-xs'>Không thể tải danh sách</div>
          ) : assignments.length > 0 ? (
            <div className='space-y-3'>
              {assignments.map((a) => {
                const cg = caregivers.find((c) => String(c.user_id) === String(a.caregiver_id));
                return (
                  <div
                    key={a.assignment_id}
                    className='bg-muted/20 hover:bg-muted/40 flex items-center gap-3 rounded-lg border p-3 transition-colors'
                  >
                    <Avatar className='h-8 w-8 bg-gradient-to-br from-green-500 to-emerald-600'>
                      <AvatarFallback className='bg-transparent text-xs font-medium text-white'>
                        {cg?.full_name
                          ? cg.full_name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase()
                          : 'CG'}
                      </AvatarFallback>
                    </Avatar>
                    <div className='min-w-0 flex-1'>
                      <div className='truncate text-sm font-medium'>
                        {cg?.full_name ? maskName(cg.full_name) : 'Người chăm sóc'}
                      </div>
                      <div className='text-muted-foreground truncate text-xs'>
                        {cg?.email
                          ? maskEmail(cg.email)
                          : cg?.phone
                            ? maskPhoneNumber(normalizePhoneTo84(cg.phone))
                            : `ID: ${a.caregiver_id}`}
                      </div>
                    </div>
                    <Button
                      size='sm'
                      variant='outline'
                      className='text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0'
                      onClick={() => setConfirmUnassign({ caregiver_id: String(a.caregiver_id) })}
                    >
                      Bỏ gán
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className='text-muted-foreground flex items-center justify-center rounded-lg border border-dashed py-6 text-sm'>
              Chưa có người chăm sóc
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
