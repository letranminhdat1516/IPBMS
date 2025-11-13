import {
  AlertTriangle,
  Bell,
  Camera,
  Clock,
  Pencil,
  Plus,
  Settings,
  Trash2,
  TrendingUp,
  UserPlus,
  UserRound,
} from 'lucide-react';
import { toast } from 'sonner';

import { useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import { ConfirmDialog } from '@/components/confirm-dialog';

import { maskPhoneNumber } from '@/lib/utils';

import {
  deleteCaregiverInvitations,
  useCaregiverInvitations,
} from '@/services/caregiver-invitations';
import { useCaregivers } from '@/services/caregivers';
import {
  EmergencyContactWithId,
  useDeleteEmergencyContact,
  useUserMedicalInfo,
  useUserMonitoring,
  useUserOverview,
} from '@/services/userDetail';

import MedicalInfo from '../MedicalInfo';
import AssignCaregiverDialog from './AssignCaregiverDialog';
import EditContactDialog from './EditContactDialog';
import EditPatientDialog from './EditPatientDialog';

interface StatCardData {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  valueClass?: string;
}

export default function OverviewTabsContent() {
  const { userId } = useParams({ from: '/_authenticated/users/customer/detail/$userId' });
  const { data: overview, isLoading, isError } = useUserOverview(userId, { range: 'today' });
  const { data: medical } = useUserMedicalInfo(userId);
  const { data: monitoring } = useUserMonitoring(userId, { include: 'settings' });
  const delMu = useDeleteEmergencyContact(userId);
  const qc = useQueryClient();
  const patientId = medical?.patient?.id;
  const {
    data: caregiverInvitations,
    isLoading: isCaregiverInvitationsLoading,
    isError: isCaregiverInvitationsError,
  } = useCaregiverInvitations(patientId ? { patient_id: String(patientId) } : undefined);
  const { data: caregiversData } = useCaregivers({ page: 1, limit: 200 });
  const caregivers = (Array.isArray(caregiversData) ? caregiversData : caregiversData?.items) ?? [];
  const [confirmUnassign, setConfirmUnassign] = useState<null | { caregiver_id: string }>(null);

  const [openPatient, setOpenPatient] = useState(false);
  const [openAssign, setOpenAssign] = useState(false);
  const [openContact, setOpenContact] = useState<null | {
    id?: string;
    name?: string;
    relation?: string;
    phone?: string;
  }>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const statCards: StatCardData[] = [
    {
      title: 'Camera hoạt động',
      value: overview?.cameraActive ?? '—',
      description: 'Số camera đang hoạt động',
      icon: <Camera className='text-muted-foreground h-4 w-4' />,
      valueClass: 'text-green-600',
    },
    {
      title: 'Thời gian giám sát',
      value: overview?.monitorTime ?? '—',
      description: 'Khoảng theo dõi',
      icon: <Clock className='text-muted-foreground h-4 w-4' />,
    },
    {
      title: 'Nhắc nhở hôm nay',
      value: String(overview?.alertCount ?? 0),
      description: 'Trong ngày',
      icon: <AlertTriangle className='text-muted-foreground h-4 w-4' />,
      valueClass: 'text-orange-600',
    },
    {
      title: 'Độ tin cậy AI',
      value:
        overview?.aiAccuracy != null && !isNaN(Number(overview.aiAccuracy))
          ? `${overview.aiAccuracy}%`
          : '—',
      description: 'Độ chính xác phát hiện',
      icon: <TrendingUp className='text-muted-foreground h-4 w-4' />,
      valueClass: 'text-blue-600',
    },
  ];

  return (
    <>
      {/* Patient Info (supplemental provided by customer) */}
      <section className='mb-8'>
        <h2 className='text-foreground mb-4 flex items-center gap-2 text-xl font-bold'>
          <Camera className='h-6 w-6 text-blue-600 dark:text-blue-400' /> Thông tin bệnh nhân (bổ
          sung)
        </h2>
        <p className='text-muted-foreground mb-4 text-sm'>
          Dữ liệu do khách hàng điền để bổ sung hồ sơ theo dõi, không phải định danh khách hàng.
        </p>
        <div className='space-y-4'>
          {/* Header section */}
          <div className='flex items-center justify-between'>
            <div>
              <h3 className='text-foreground text-lg font-semibold'>Thông tin bệnh nhân</h3>
              <p className='text-muted-foreground mt-1 text-sm'>
                Hồ sơ bệnh nhân và danh sách người chăm sóc
              </p>
            </div>
            <div className='flex items-center gap-2'>
              <Button
                size='sm'
                variant='outline'
                className='hover:border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-950/20'
                onClick={() => setOpenPatient(true)}
              >
                <Settings className='mr-2 h-4 w-4' />
                Chỉnh sửa
              </Button>
              {medical?.patient?.id && (
                <Button
                  size='sm'
                  className='bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700'
                  onClick={() => setOpenAssign(true)}
                >
                  <UserPlus className='mr-2 h-4 w-4' />
                  Gán người chăm sóc
                </Button>
              )}
            </div>
          </div>

          {/* Content section */}
          {isError && (
            <Alert className='border-destructive/20 bg-destructive/5'>
              <AlertTriangle className='text-destructive h-4 w-4' />
              <AlertDescription className='text-destructive'>
                Không thể tải dữ liệu tổng quan. Vui lòng thử lại sau.
              </AlertDescription>
            </Alert>
          )}

          {isLoading ? (
            <div className='space-y-4'>
              <Skeleton className='h-24 w-full rounded-lg' />
              <div className='grid grid-cols-2 gap-4'>
                <Skeleton className='h-16 w-full rounded-lg' />
                <Skeleton className='h-16 w-full rounded-lg' />
              </div>
            </div>
          ) : medical?.patient ? (
            <MedicalInfo
              medical={medical}
              assignments={caregiverInvitations ?? []}
              caregivers={caregivers}
              isAssignmentsLoading={isCaregiverInvitationsLoading}
              isAssignmentsError={isCaregiverInvitationsError}
              setConfirmUnassign={setConfirmUnassign}
            />
          ) : (
            <div className='bg-muted/20 flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center'>
              <div className='bg-muted/30 mb-4 rounded-full p-4'>
                <UserRound className='text-muted-foreground h-8 w-8' />
              </div>
              <h3 className='text-foreground mb-2 text-lg font-medium'>
                Chưa có thông tin bệnh nhân
              </h3>
              <p className='text-muted-foreground mb-4 max-w-md text-sm'>
                Hãy bắt đầu bằng cách thêm thông tin cơ bản của bệnh nhân để theo dõi hiệu quả hơn.
              </p>
              <Button
                onClick={() => setOpenPatient(true)}
                variant='outline'
                className='hover:border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-950/20'
              >
                <Plus className='mr-2 h-4 w-4' />
                Thêm thông tin bệnh nhân
              </Button>
            </div>
          )}
        </div>
      </section>
      <AssignCaregiverDialog
        open={openAssign}
        onOpenChange={setOpenAssign}
        patientId={medical?.patient?.id ?? null}
      />

      {/* Emergency Contacts */}
      <section className='mb-8'>
        <div className='mb-4 flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div className='rounded-lg bg-pink-100 p-2 dark:bg-pink-500/10'>
              <UserRound className='h-5 w-5 text-pink-600 dark:text-pink-300' />
            </div>
            <div>
              <h2 className='text-foreground text-xl font-bold'>Người liên hệ khẩn cấp</h2>
              <p className='text-muted-foreground text-sm'>
                Thông tin liên hệ trong trường hợp khẩn cấp
              </p>
            </div>
          </div>
          <Button size='sm' onClick={() => setOpenContact({})}>
            <Plus className='mr-2 h-4 w-4' /> Thêm liên hệ
          </Button>
        </div>

        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
          {(medical?.contacts ?? []).map((contact, idx) => (
            <Card key={idx} className='transition-shadow duration-200 hover:shadow-md'>
              <CardContent className='p-4'>
                <div className='flex items-center gap-4'>
                  <div className='flex h-12 w-12 items-center justify-center rounded-full border-2 border-pink-200/60 bg-pink-50 dark:border-pink-900/40 dark:bg-pink-900/20'>
                    <UserRound className='h-5 w-5 text-pink-600 dark:text-pink-300' />
                  </div>
                  <div className='min-w-0 flex-1'>
                    <div className='mb-1 flex items-center gap-2'>
                      <span className='text-foreground truncate font-semibold'>{contact.name}</span>
                      <span className='rounded-full bg-pink-500/10 px-2 py-0.5 text-xs font-semibold text-pink-700 dark:text-pink-300'>
                        {contact.relation}
                      </span>
                    </div>
                    <div className='text-muted-foreground truncate text-sm'>
                      {contact.phone ? maskPhoneNumber(contact.phone) : ''}
                    </div>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Button
                      variant='outline'
                      size='icon'
                      className='h-8 w-8'
                      onClick={() =>
                        setOpenContact({
                          id: (contact as EmergencyContactWithId).id,
                          name: contact.name,
                          relation: contact.relation,
                          phone: contact.phone,
                        })
                      }
                    >
                      <Pencil className='h-4 w-4' />
                    </Button>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='text-destructive hover:bg-destructive/10 h-8 w-8'
                      onClick={() =>
                        setConfirmDeleteId((contact as EmergencyContactWithId).id ?? null)
                      }
                    >
                      <Trash2 className='h-4 w-4' />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {(medical?.contacts?.length ?? 0) === 0 && (
            <div className='bg-muted/20 col-span-full flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center'>
              <div className='bg-muted/30 mb-3 rounded-full p-3'>
                <UserRound className='text-muted-foreground h-6 w-6' />
              </div>
              <p className='text-muted-foreground text-sm'>Chưa có liên hệ khẩn cấp</p>
            </div>
          )}
        </div>
      </section>

      {/* Monitoring Settings Summary */}
      <section className='mb-8'>
        <div className='mb-4 flex items-center gap-3'>
          <div className='rounded-lg bg-indigo-100 p-2 dark:bg-indigo-500/10'>
            <TrendingUp className='h-5 w-5 text-indigo-600 dark:text-indigo-400' />
          </div>
          <div>
            <h2 className='text-foreground text-xl font-bold'>Cài đặt giám sát</h2>
            <p className='text-muted-foreground text-sm'>Thông số cấu hình hệ thống theo dõi</p>
          </div>
        </div>

        <Card>
          <CardContent className='p-6'>
            <div className='grid grid-cols-1 gap-6 md:grid-cols-3'>
              <div className='flex items-center gap-3'>
                <div className='rounded-lg bg-indigo-500/10 p-2'>
                  <TrendingUp className='h-5 w-5 text-indigo-600 dark:text-indigo-400' />
                </div>
                <div>
                  <p className='text-muted-foreground text-sm font-medium'>Độ nhạy nhắc nhở</p>
                  <p className='font-semibold text-indigo-700 capitalize dark:text-indigo-300'>
                    {monitoring?.settings?.sensitivity ?? '—'}
                  </p>
                </div>
              </div>

              <div className='flex items-center gap-3'>
                <div className='rounded-lg bg-indigo-500/10 p-2'>
                  <Clock className='h-5 w-5 text-indigo-600 dark:text-indigo-400' />
                </div>
                <div>
                  <p className='text-muted-foreground text-sm font-medium'>Thời gian ngồi tối đa</p>
                  <p className='font-semibold text-indigo-700 dark:text-indigo-300'>
                    {monitoring?.settings?.maxSitMinutes != null
                      ? `${monitoring.settings.maxSitMinutes} phút`
                      : '—'}
                  </p>
                </div>
              </div>

              <div className='flex items-center gap-3'>
                <div className='rounded-lg bg-indigo-500/10 p-2'>
                  <Bell className='h-5 w-5 text-indigo-600 dark:text-indigo-400' />
                </div>
                <div>
                  <p className='text-muted-foreground text-sm font-medium'>Phương thức thông báo</p>
                  <p className='font-semibold text-indigo-700 dark:text-indigo-300'>
                    {Array.isArray(
                      (monitoring?.settings as unknown as { notifyChannels?: string[] })
                        ?.notifyChannels
                    ) &&
                    ((monitoring?.settings as unknown as { notifyChannels?: string[] })
                      .notifyChannels?.length ?? 0) > 0
                      ? (monitoring?.settings as unknown as { notifyChannels?: string[] })
                          .notifyChannels!.join(', ')
                          .toUpperCase()
                      : '—'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Stats Cards */}
      <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4'>
        {statCards.map((card, idx) => (
          <Card key={idx}>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>{card.title}</CardTitle>
              {card.icon}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${card.valueClass ?? ''}`}>{card.value}</div>
              <p className='text-muted-foreground text-xs'>{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Gợi ý: xem chi tiết dòng thời gian ở tab Giám sát */}
      <EditPatientDialog
        userId={userId}
        open={openPatient}
        onOpenChange={setOpenPatient}
        initial={medical?.patient ? { name: medical.patient.name, dob: medical.patient.dob } : null}
      />
      <EditContactDialog
        userId={userId}
        open={Boolean(openContact)}
        onOpenChange={(v) => !v && setOpenContact(null)}
        initial={openContact ?? undefined}
      />
      <ConfirmDialog
        open={Boolean(confirmDeleteId)}
        onOpenChange={(v) => !v && setConfirmDeleteId(null)}
        title='Xóa liên hệ?'
        desc='Hành động này không thể hoàn tác.'
        destructive
        handleConfirm={async () => {
          if (confirmDeleteId) {
            await delMu.mutateAsync(confirmDeleteId);
            setConfirmDeleteId(null);
          }
        }}
        confirmText={delMu.isPending ? 'Đang xóa…' : 'Xóa'}
        cancelBtnText='Hủy'
      />
      <ConfirmDialog
        open={Boolean(confirmUnassign)}
        onOpenChange={(v) => !v && setConfirmUnassign(null)}
        title='Bỏ gán người chăm sóc?'
        desc='Hành động này sẽ xóa liên kết giữa bệnh nhân và người chăm sóc.'
        destructive
        handleConfirm={async () => {
          if (confirmUnassign && userId) {
            try {
              const res = await deleteCaregiverInvitations({
                customer_id: String(userId),
                caregiver_id: confirmUnassign.caregiver_id,
              });
              if (res?.success && res.assignment) {
                toast.success('Đã hủy gán người chăm sóc.');
                await qc.invalidateQueries({
                  queryKey: ['caregiver-invitations', { patient_id: String(userId) }],
                });
              } else {
                toast.error('Không thể hủy gán (không có assignment nào được cập nhật).');
              }
            } catch (_err) {
              toast.error('Không thể hủy gán.');
            } finally {
              setConfirmUnassign(null);
            }
          }
        }}
        confirmText='Bỏ gán'
        cancelBtnText='Hủy'
      />
    </>
  );
}
