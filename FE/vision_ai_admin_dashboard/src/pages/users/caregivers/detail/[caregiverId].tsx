import { useState } from 'react';

import { Link, useParams } from '@tanstack/react-router';

import { Header } from '@/components/layout/header';
import { Main } from '@/components/layout/main';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

import { maskEmail, maskPhoneNumber } from '@/lib/utils';

import { useCaregiver } from '@/services/caregivers';

import { AssignPatientDialog } from '../components/assign-patient-dialog';
import { CaregiverAssignedPatients } from '../components/caregiver-assigned-patients';
import { CaregiverAuditLog } from '../components/caregiver-auditLog';

export default function CaregiverDetail() {
  const { caregiverId } = useParams({
    from: '/_authenticated/users/caregiver/detail/$caregiverId',
  });
  const { data: caregiver, isLoading, isError } = useCaregiver(caregiverId);
  const [openAssign, setOpenAssign] = useState(false);

  if (isLoading) {
    return (
      <Main className='flex h-full items-center justify-center'>
        <div className='text-muted-foreground'>Đang tải thông tin người chăm sóc…</div>
      </Main>
    );
  }

  if (isError || !caregiver) {
    return (
      <Main className='flex h-full items-center justify-center'>
        <div className='text-muted-foreground'>Không tìm thấy người chăm sóc.</div>
      </Main>
    );
  }

  return (
    <>
      <Header fixed />
      <Main>
        <div className='space-y-6'>
          <div className='text-muted-foreground flex items-center gap-2 text-sm'>
            <Link to='/' className='hover:text-foreground'>
              Trang chủ
            </Link>
            <span>/</span>
            <Link to='/users/caregiver' className='hover:text-foreground'>
              Người chăm sóc
            </Link>
            <span>/</span>
            <span className='text-foreground'>{caregiver.full_name}</span>
          </div>
          <div className='flex items-center justify-between'>
            <h1 className='text-2xl font-bold'>Chi tiết người chăm sóc</h1>
            <div className='flex gap-2'>
              <Button variant='outline' onClick={() => setOpenAssign(true)}>
                Gán bệnh nhân
              </Button>
              <Button variant='outline' onClick={() => history.back()} className='hover:bg-muted'>
                Quay lại
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{caregiver.full_name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='grid gap-4 sm:grid-cols-2'>
                <div>
                  <div className='text-muted-foreground text-xs'>Email</div>
                  <div className='text-sm'>{caregiver.email ? maskEmail(caregiver.email) : ''}</div>
                </div>
                <div>
                  <div className='text-muted-foreground text-xs'>Số điện thoại</div>
                  <div className='text-sm'>
                    {caregiver.phone ? maskPhoneNumber(caregiver.phone) : ''}
                  </div>
                </div>
                <div>
                  <div className='text-muted-foreground text-xs'>Trạng thái</div>
                  <div className='text-sm capitalize'>{caregiver.status}</div>
                </div>
                <div>
                  <div className='text-muted-foreground text-xs'>Đăng ký lúc</div>
                  <div className='text-sm'>
                    {new Date(caregiver.registered_at).toLocaleString()}
                  </div>
                </div>
              </div>
              <Separator className='my-6' />
              <div className='text-muted-foreground text-xs'>Mã Người chăm sóc</div>
              <div className='text-sm font-medium'>{String(caregiver.user_id)}</div>
              <CaregiverAssignedPatients caregiverId={caregiver.user_id} />
              <CaregiverAuditLog caregiverId={caregiver.user_id} />
            </CardContent>
          </Card>
          <AssignPatientDialog
            open={openAssign}
            onOpenChange={setOpenAssign}
            caregiverId={caregiver.user_id}
          />
        </div>
      </Main>
    </>
  );
}
