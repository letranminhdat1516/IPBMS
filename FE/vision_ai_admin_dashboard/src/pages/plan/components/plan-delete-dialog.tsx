import { useEffect, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

import type { Plan } from '@/types/plan';

import { archivePlan, deletePlan, deprecatePlan } from '@/services/adminPlan';
import { checkPlanUsage } from '@/services/subscriptions';

import { usePlan } from '../context/plan-context';

export function PlanDeleteDialog() {
  const { open, setOpen, currentRow, refetch } = usePlan();
  const queryClient = useQueryClient();

  const [planUsage, setPlanUsage] = useState<{
    isUsed: boolean;
    activeSubscriptions: number;
    totalSubscriptions: number;
    cancelledSubscriptions: number;
    expiredSubscriptions: number;
  } | null>(null);
  const [checkingUsage, setCheckingUsage] = useState(false);
  const [deleteMode, setDeleteMode] = useState<'deprecate' | 'archive' | 'hard_delete'>(
    'deprecate'
  );
  const [successorPlanCode, setSuccessorPlanCode] = useState('');

  // Check plan usage when dialog opens
  useEffect(() => {
    if (open === 'delete' && currentRow?.code) {
      setCheckingUsage(true);
      setDeleteMode('deprecate'); // Reset to default
      setSuccessorPlanCode('');
      checkPlanUsage(currentRow.code)
        .then(setPlanUsage)
        .finally(() => setCheckingUsage(false));
    } else {
      setPlanUsage(null);
      setCheckingUsage(false);
    }
  }, [open, currentRow?.code]);

  const deleteMutation = useMutation({
    mutationFn: async ({
      planId,
      mode,
      successorPlanCode,
    }: {
      planId: string;
      mode: 'deprecate' | 'archive' | 'hard_delete';
      successorPlanCode?: string;
    }) => {
      switch (mode) {
        case 'deprecate':
          return deprecatePlan(planId, successorPlanCode);
        case 'archive':
          return archivePlan(planId, successorPlanCode);
        case 'hard_delete':
          return deletePlan(planId);
        default:
          throw new Error('Invalid delete mode');
      }
    },
    // Optimistic update: remove the plan/version from cached queries immediately
    onMutate: async ({
      planId,
      mode,
    }: {
      planId: string;
      mode: 'deprecate' | 'archive' | 'hard_delete';
      successorPlanCode?: string;
    }) => {
      // For hard delete, do optimistic updates
      if (mode === 'hard_delete') {
        await queryClient.cancelQueries({ queryKey: ['plans'], exact: false });

        const previousFalse = queryClient.getQueryData<Plan[] | undefined>(['plans', false]);
        const previousTrue = queryClient.getQueryData<Plan[] | undefined>(['plans', true]);

        // Remove from plans (no versions)
        if (previousFalse) {
          const next = previousFalse.filter((p) => p.id !== planId && p.code !== planId);
          queryClient.setQueryData(['plans', false], next);
        }

        // Remove from plans-with-versions
        if (previousTrue) {
          const next = previousTrue
            .map((plan) => {
              // If target equals plan.code or plan.id, remove the whole plan
              if (plan.code === planId || plan.id === planId) return null;
              // Otherwise filter out versions that match the target (version id)
              const versions = (plan.versions || []).filter((v) => (v?.id ?? '') !== planId);
              return { ...plan, versions };
            })
            .filter(Boolean);
          queryClient.setQueryData(['plans', true], next);
        }

        return { previousFalse, previousTrue };
      }
      return {};
    },
    onError: (
      _err,
      _target,
      context: { previousFalse?: Plan[]; previousTrue?: Plan[] } | undefined
    ) => {
      // Rollback to previous cache on error
      if (context?.previousFalse) {
        queryClient.setQueryData(['plans', false], context.previousFalse);
      }
      if (context?.previousTrue) {
        queryClient.setQueryData(['plans', true], context.previousTrue);
      }
    },
    onSettled: () => {
      // Ensure any plans queries are invalidated (with or without versions)
      queryClient.invalidateQueries({ queryKey: ['plans'], exact: false });
      // Also ensure queries are refetched immediately
      queryClient.refetchQueries({ queryKey: ['plans'], exact: false });
      try {
        refetch?.();
      } catch {
        /* ignore */
      }
      setOpen(null);
    },
  });

  const handleDelete = () => {
    const planId = currentRow?.id || currentRow?.code;
    if (planId) {
      deleteMutation.mutate({
        planId,
        mode: deleteMode,
        successorPlanCode: successorPlanCode || undefined,
      });
    }
  };

  const handleClose = () => {
    setOpen(null);
  };

  // Check if plan can be deleted based on business rules
  const canArchive = !currentRow?.is_current; // Cannot archive if currently active
  const canHardDelete =
    !planUsage?.isUsed &&
    !currentRow?.is_current &&
    planUsage &&
    planUsage.totalSubscriptions === 0; // Only if no references at all
  const isLoading = checkingUsage || deleteMutation.isPending;

  return (
    <AlertDialog open={open === 'delete'} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xác nhận xóa gói dịch vụ</AlertDialogTitle>
          <AlertDialogDescription>
            {checkingUsage ? (
              <span>Đang kiểm tra việc sử dụng gói dịch vụ...</span>
            ) : (
              <div className='space-y-4'>
                {/* Impact Report */}
                <div className='space-y-2'>
                  <div className='font-medium'>Tác động của việc xóa gói dịch vụ:</div>
                  <div className='space-y-1 text-sm'>
                    {planUsage?.isUsed && (
                      <div className='text-destructive'>
                        • Gói dịch vụ đang có{' '}
                        <strong>{planUsage.activeSubscriptions} subscription đang active</strong>
                      </div>
                    )}
                    {currentRow?.is_current && (
                      <div className='text-destructive'>
                        • Gói dịch vụ đang được <strong>kích hoạt</strong> làm plan hiện tại
                      </div>
                    )}
                    {planUsage && planUsage.totalSubscriptions > 0 && (
                      <div className='text-amber-600'>
                        • Gói dịch vụ có{' '}
                        <strong>{planUsage.totalSubscriptions} subscription</strong> trong lịch sử
                        {planUsage.cancelledSubscriptions > 0 &&
                          ` (${planUsage.cancelledSubscriptions} đã hủy)`}
                        {planUsage.expiredSubscriptions > 0 &&
                          ` (${planUsage.expiredSubscriptions} đã hết hạn)`}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Options */}
                <div className='space-y-3'>
                  <div className='font-medium'>Chọn hành động:</div>
                  <RadioGroup
                    value={deleteMode}
                    onValueChange={(value: 'deprecate' | 'archive' | 'hard_delete') =>
                      setDeleteMode(value)
                    }
                  >
                    <div className='flex items-center space-x-2'>
                      <RadioGroupItem value='deprecate' id='deprecate' />
                      <Label htmlFor='deprecate' className='text-sm'>
                        <strong>Ngừng bán (Deprecate)</strong> - Ẩn khỏi trang chọn gói, khách hàng
                        cũ vẫn dùng được
                      </Label>
                    </div>
                    <div className='flex items-center space-x-2'>
                      <RadioGroupItem value='archive' id='archive' disabled={!canArchive} />
                      <Label
                        htmlFor='archive'
                        className={`text-sm ${!canArchive ? 'text-muted-foreground' : ''}`}
                      >
                        <strong>Lưu trữ (Archive)</strong> - Ẩn khỏi UI, khách hàng cũ dùng đến hết
                        kỳ
                        {!canArchive && ' (không thể archive plan đang active)'}
                      </Label>
                    </div>
                    <div className='flex items-center space-x-2'>
                      <RadioGroupItem
                        value='hard_delete'
                        id='hard_delete'
                        disabled={!canHardDelete}
                      />
                      <Label
                        htmlFor='hard_delete'
                        className={`text-sm ${!canHardDelete ? 'text-muted-foreground' : ''}`}
                      >
                        <strong>Xóa vĩnh viễn (Hard Delete)</strong> - Xóa hoàn toàn khỏi database
                        {!canHardDelete && ' (chỉ khi không có subscription nào)'}
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Successor Plan for Deprecate/Archive */}
                {(deleteMode === 'deprecate' || deleteMode === 'archive') && (
                  <div className='space-y-2'>
                    <Label htmlFor='successor' className='text-sm font-medium'>
                      Gói kế nhiệm (tùy chọn):
                    </Label>
                    <input
                      id='successor'
                      type='text'
                      placeholder='Nhập mã gói kế nhiệm...'
                      value={successorPlanCode}
                      onChange={(e) => setSuccessorPlanCode(e.target.value)}
                      className='border-input bg-background w-full rounded-md border px-3 py-2 text-sm'
                    />
                    <div className='text-muted-foreground text-xs'>
                      Khách hàng sẽ được migrate sang gói này khi gia hạn (nếu có).
                    </div>
                  </div>
                )}
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleClose}>Hủy</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={
              (deleteMode === 'archive' && !canArchive) ||
              (deleteMode === 'hard_delete' && !canHardDelete) ||
              isLoading
            }
            className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
          >
            {isLoading
              ? 'Đang xử lý...'
              : `Xác nhận ${deleteMode === 'deprecate' ? 'Ngừng bán' : deleteMode === 'archive' ? 'Lưu trữ' : 'Xóa vĩnh viễn'}`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
