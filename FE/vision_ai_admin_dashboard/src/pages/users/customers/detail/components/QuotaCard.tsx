import { AlertCircle, Camera, Clock, HardDrive, Info, MapPin, Users } from 'lucide-react';

import { useState } from 'react';

import { useParams } from '@tanstack/react-router';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { useUserQuota } from '@/services/userDetail';

import QuotaItem from './quota-item';
import QuotaLastUpdated from './quota-last-updated';
import QuotaStorage from './quota-storage';
import UpdateQuotaDialog from './update-quota-dialog';

export default function QuotaCard() {
  const { userId } = useParams({ from: '/_authenticated/users/customer/detail/$userId' });
  const { data: quota, isLoading, isError } = useUserQuota(userId);
  const [openEdit, setOpenEdit] = useState(false);

  const quotaItems = [
    {
      icon: Camera as unknown as React.ComponentType<Record<string, unknown>>,
      label: 'Camera Quota',
      value: quota?.camera_quota,
      description: 'Số lượng camera tối đa được phép',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      icon: Clock as unknown as React.ComponentType<Record<string, unknown>>,
      label: 'Retention',
      value: `${quota?.retention_days} ngày`,
      description: 'Thời gian lưu trữ dữ liệu',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      icon: Users as unknown as React.ComponentType<Record<string, unknown>>,
      label: 'Caregiver Seats',
      value: quota?.caregiver_seats,
      description: 'Số lượng người chăm sóc',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      icon: MapPin as unknown as React.ComponentType<Record<string, unknown>>,
      label: 'Sites',
      value: quota?.sites,
      description: 'Số lượng địa điểm',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      icon: HardDrive as unknown as React.ComponentType<Record<string, unknown>>,
      label: 'Max Storage',
      value: `${quota?.max_storage_gb} GB`,
      description: 'Dung lượng lưu trữ tối đa',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
  ];

  return (
    <Card className='shadow-sm'>
      <CardHeader className='pb-4'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <CardTitle className='text-lg font-semibold'>Quota người dùng</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className='text-muted-foreground h-4 w-4' />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Thông tin giới hạn sử dụng của người dùng</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div>
            <button className='text-sm underline' onClick={() => setOpenEdit(true)}>
              Chỉnh sửa Quota
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className='space-y-4'>
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className='h-16 w-full' />
            ))}
          </div>
        ) : isError || !quota ? (
          <div className='flex items-center justify-center py-8'>
            <div className='text-center'>
              <AlertCircle className='text-destructive mx-auto mb-2 h-12 w-12' />
              <p className='text-destructive font-medium'>Không lấy được thông tin quota</p>
              <p className='text-muted-foreground text-sm'>Vui lòng thử lại sau</p>
            </div>
          </div>
        ) : (
          <div className='space-y-4'>
            {quotaItems.map((item, index) => (
              <QuotaItem
                key={index}
                icon={item.icon}
                label={item.label}
                value={item.value}
                description={item.description}
                bgColor={item.bgColor}
                color={item.color}
              />
            ))}

            <QuotaStorage
              usedGb={quota.max_storage_gb}
              maxGb={quota.max_storage_gb}
              percent={Math.round(
                (quota.max_storage_gb ? (quota.max_storage_gb / quota.max_storage_gb) * 100 : 0) ||
                  0
              )}
            />

            <QuotaLastUpdated updatedAt={quota.updated_at} />
          </div>
        )}
      </CardContent>
      <UpdateQuotaDialog
        open={openEdit}
        onOpenChange={setOpenEdit}
        userId={userId}
        defaultValues={quota ?? {}}
      />
    </Card>
  );
}
