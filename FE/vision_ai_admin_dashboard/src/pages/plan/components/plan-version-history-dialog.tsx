import { toast } from 'sonner';

import { useCallback, useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

import { Plan, PlanVersion } from '@/types/plan';

import { activatePlanVersion, getPlanVersions } from '@/services/adminPlan';

import { usePlan } from '../context/plan-context';

interface PlanVersionHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: Plan | null;
}

export function PlanVersionHistoryDialog({
  open,
  onOpenChange,
  plan,
}: PlanVersionHistoryDialogProps) {
  const [versions, setVersions] = useState<PlanVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const { refetch } = usePlan();

  const fetchVersions = useCallback(async () => {
    if (!plan?.code) return;

    setLoading(true);
    try {
      const data = await getPlanVersions(plan.code);
      setVersions(data);
    } catch (_error) {
      toast.error('Không thể tải lịch sử phiên bản');
    } finally {
      setLoading(false);
    }
  }, [plan?.code]);

  useEffect(() => {
    if (open && plan?.code) {
      fetchVersions();
    }
  }, [open, plan?.code, fetchVersions]);

  const handleActivateVersion = async (versionId: string) => {
    try {
      await activatePlanVersion(versionId);
      toast.success('Đã kích hoạt phiên bản thành công');
      await fetchVersions();
      refetch?.();
    } catch (_error) {
      toast.error('Có lỗi xảy ra khi kích hoạt phiên bản');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (price: string) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(Number(price));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[80vh] max-w-4xl'>
        <DialogHeader>
          <DialogTitle>Lịch sử phiên bản - {plan?.name}</DialogTitle>
          <DialogDescription>Xem và quản lý tất cả phiên bản của gói dịch vụ này</DialogDescription>
        </DialogHeader>

        <ScrollArea className='max-h-[60vh] pr-4'>
          {loading ? (
            <div className='flex items-center justify-center py-8'>
              <div className='text-muted-foreground'>Đang tải...</div>
            </div>
          ) : versions.length === 0 ? (
            <div className='flex items-center justify-center py-8'>
              <div className='text-muted-foreground'>Không có phiên bản nào</div>
            </div>
          ) : (
            <div className='space-y-4'>
              {versions.map((version, index) => (
                <div key={version.id} className='rounded-lg border p-4'>
                  <div className='mb-3 flex items-center justify-between'>
                    <div className='flex items-center gap-3'>
                      <Badge variant={version.is_current ? 'default' : 'outline'}>
                        v{version.version}
                      </Badge>
                      {version.is_current && <Badge variant='secondary'>Hiện tại</Badge>}
                    </div>
                    {!version.is_current && (
                      <Button
                        size='sm'
                        onClick={() =>
                          handleActivateVersion(version.version_id || version.id || '')
                        }
                      >
                        Kích hoạt
                      </Button>
                    )}
                  </div>

                  <div className='grid grid-cols-2 gap-4 text-sm md:grid-cols-4'>
                    <div>
                      <span className='text-muted-foreground'>Giá:</span>
                      <div className='font-medium'>{formatCurrency(version.price)}</div>
                    </div>
                    <div>
                      <span className='text-muted-foreground'>Camera:</span>
                      <div className='font-medium'>{version.camera_quota}</div>
                    </div>
                    <div>
                      <span className='text-muted-foreground'>Caregiver:</span>
                      <div className='font-medium'>{version.caregiver_seats}</div>
                    </div>
                    <div>
                      <span className='text-muted-foreground'>Địa điểm:</span>
                      <div className='font-medium'>{version.sites}</div>
                    </div>
                    <div>
                      <span className='text-muted-foreground'>Lưu trữ:</span>
                      <div className='font-medium'>{version.retention_days} ngày</div>
                    </div>
                    <div>
                      <span className='text-muted-foreground'>Cập nhật:</span>
                      <div className='font-medium'>{version.major_updates_months} tháng</div>
                    </div>
                    <div>
                      <span className='text-muted-foreground'>Hiệu lực từ:</span>
                      <div className='font-medium'>{formatDate(version.effective_from)}</div>
                    </div>
                    {version.effective_to && (
                      <div>
                        <span className='text-muted-foreground'>Hiệu lực đến:</span>
                        <div className='font-medium'>{formatDate(version.effective_to)}</div>
                      </div>
                    )}
                  </div>

                  <div className='text-muted-foreground mt-3 text-xs'>
                    Tạo: {formatDate(version.created_at)}
                    {version.updated_at && ` • Cập nhật: ${formatDate(version.updated_at)}`}
                  </div>

                  {index < versions.length - 1 && <Separator className='mt-4' />}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
