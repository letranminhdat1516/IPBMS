import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { useEffect } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

import { DatePicker } from '@/components/date-picker';

import { useErrorInterceptor } from '@/lib/global-error-interceptor';

import type { Plan } from '@/types/plan';

import { createPlan, updatePlan } from '@/services/adminPlan';

import { usePlan } from '../context/plan-context';

const planSchema = z
  .object({
    code: z.string().min(1, 'Mã gói là bắt buộc'),
    version: z.string().min(1, 'Phiên bản là bắt buộc'),
    name: z.string().min(1, 'Tên gói là bắt buộc'),
    // Accept string in form; validate numeric content later in superRefine
    price: z.string().min(1, 'Giá là bắt buộc'),
    camera_quota: z.number().min(0, 'Hạn mức camera phải là số dương'),
    retention_days: z.number().min(1, 'Thời gian lưu trữ phải ít nhất 1 ngày'),
    caregiver_seats: z.number().min(0, 'Số chỗ người chăm sóc phải là số dương'),
    sites: z.number().min(0, 'Số địa điểm phải là số dương'),
    major_updates_months: z.number().min(0, 'Chu kỳ cập nhật chính phải là số dương'),
    effective_from: z.string().optional(),
    effective_to: z.string().optional(),
  })
  .superRefine((obj, ctx) => {
    // price must be numeric and >= 0 after parsing from the form string
    const parsed = Number.parseFloat(String(obj.price));
    if (!Number.isFinite(parsed) || parsed < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Giá phải là một số không âm',
        path: ['price'],
      });
    }

    // If both dates provided, ensure effective_to >= effective_from
    if (obj.effective_from && obj.effective_to) {
      const from = new Date(obj.effective_from);
      const to = new Date(obj.effective_to);
      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Ngày không hợp lệ',
          path: ['effective_from'],
        });
      } else if (to.getTime() < from.getTime()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Ngày kết thúc phải sau hoặc bằng ngày bắt đầu',
          path: ['effective_to'],
        });
      }
    }
  });

type PlanFormData = z.infer<typeof planSchema>;

export function PlanDialog() {
  const { open, setOpen, currentRow, refetch } = usePlan();
  const queryClient = useQueryClient();
  const { reportError, reportSuccess } = useErrorInterceptor('plan-management');

  const form = useForm<PlanFormData>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      code: '',
      version: '1.0',
      name: '',
      price: '0',
      camera_quota: 1,
      retention_days: 30,
      caregiver_seats: 1,
      sites: 1,
      major_updates_months: 12,
      effective_from: '',
      effective_to: '',
    },
  });

  type CreatePlanPayload = Omit<Plan, 'created_at' | 'updated_at'>;
  type UpdatePlanPayload = Partial<CreatePlanPayload>;

  const createMutation = useMutation({
    mutationFn: (data: CreatePlanPayload) => createPlan(data as unknown as CreatePlanPayload),
    onSuccess: () => {
      // Invalidate any queries that start with ['plans'] (including ['plans', showVersions])
      queryClient.invalidateQueries({ queryKey: ['plans'], exact: false });
      // Also ensure queries are refetched immediately
      queryClient.refetchQueries({ queryKey: ['plans'], exact: false });
      // Also call page-provided refetch helper if available (PlanPage sets this on mount)
      try {
        refetch?.();
      } catch {
        /* ignore */
      }
      setOpen(null);
      form.reset();
      reportSuccess();
      toast.success('Tạo gói dịch vụ thành công!');
    },
    onError: (error) => {
      reportError(error);
      toast.error('Không thể tạo gói dịch vụ. Vui lòng thử lại.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ code, data }: { code: string; data: UpdatePlanPayload }) =>
      updatePlan(code, data as unknown as UpdatePlanPayload),
    onSuccess: () => {
      // Invalidate any queries that start with ['plans'] (including ['plans', showVersions])
      queryClient.invalidateQueries({ queryKey: ['plans'], exact: false });
      // Also ensure queries are refetched immediately
      queryClient.refetchQueries({ queryKey: ['plans'], exact: false });
      // Also call page-provided refetch helper if available
      try {
        refetch?.();
      } catch {
        /* ignore */
      }
      setOpen(null);
      form.reset();
      reportSuccess();
      toast.success('Cập nhật gói dịch vụ thành công!');
    },
    onError: (error) => {
      reportError(error);
      toast.error('Không thể cập nhật gói dịch vụ. Vui lòng thử lại.');
    },
  });

  useEffect(() => {
    if (currentRow) {
      form.reset({
        code: currentRow.code || '',
        version: (currentRow && (currentRow.version as string)) || '1.0',
        name: currentRow.name || '',
        // keep price as string for the form
        price: currentRow.price ? String(currentRow.price) : '0',
        camera_quota: currentRow.camera_quota || 1,
        retention_days: currentRow.retention_days || 30,
        caregiver_seats: currentRow.caregiver_seats || 1,
        sites: currentRow.sites || 1,
        major_updates_months: currentRow.major_updates_months || 12,
        effective_from: currentRow.effective_from || '',
        effective_to: currentRow.effective_to || '',
      });
    } else {
      form.reset({
        code: '',
        version: '1.0',
        name: '',
        price: '0',
        camera_quota: 1,
        retention_days: 30,
        caregiver_seats: 1,
        sites: 1,
        major_updates_months: 12,
        effective_from: '',
        effective_to: '',
      });
    }
  }, [currentRow, form]);

  const handleClose = () => {
    setOpen(null);
    form.reset();
  };

  const onSubmit = (data: PlanFormData) => {
    // Backend expects `price` as a number >= 0. The form stores it as a string for UX.
    // data.price is still a string here (form-level). Use parseFloat and ensure non-negative.
    const priceNumber = Number.parseFloat(String(data.price));
    const toIsoDate = (d?: string) => (d && d.trim() !== '' ? `${d.trim()}T00:00:00Z` : undefined);

    const payload = {
      ...data,
      price: Number.isFinite(priceNumber) && priceNumber >= 0 ? priceNumber : 0,
      effective_from: toIsoDate(data.effective_from),
      effective_to: toIsoDate(data.effective_to),
    };

    if (currentRow) {
      updateMutation.mutate({
        code: currentRow.code,
        data: payload as unknown as UpdatePlanPayload,
      });
    } else {
      createMutation.mutate(payload as unknown as CreatePlanPayload);
    }
  };

  return (
    <Dialog open={!!open && open !== 'delete'} onOpenChange={handleClose}>
      <DialogContent className='sm:max-w-[600px]'>
        <DialogHeader>
          <DialogTitle>{currentRow ? 'Chỉnh sửa gói dịch vụ' : 'Tạo gói dịch vụ mới'}</DialogTitle>
          <DialogDescription>
            {currentRow
              ? 'Cập nhật thông tin gói dịch vụ bên dưới.'
              : 'Điền thông tin để tạo gói dịch vụ mới.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit, (_errors) => {
              toast.error('Form chưa hợp lệ. Vui lòng kiểm tra các trường.');
            })}
            className='space-y-4'
          >
            <div className='grid grid-cols-3 gap-4'>
              <FormField
                control={form.control}
                name='code'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mã gói</FormLabel>
                    <FormControl>
                      <Input placeholder='Nhập mã gói dịch vụ' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='name'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên gói</FormLabel>
                    <FormControl>
                      <Input placeholder='Nhập tên gói dịch vụ' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='version'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phiên bản</FormLabel>
                    <FormControl>
                      <Input placeholder='Ví dụ: 1.0' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name='price'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Giá (VNĐ)</FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      placeholder='Nhập giá gói dịch vụ'
                      {...field}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='camera_quota'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hạn mức camera</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        placeholder='Nhập số lượng camera cho phép'
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='retention_days'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Thời gian lưu trữ (ngày)</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        placeholder='Nhập số ngày lưu trữ dữ liệu'
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='caregiver_seats'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Số chỗ người chăm sóc</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        placeholder='Nhập số lượng người chăm sóc'
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='sites'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Số địa điểm</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        placeholder='Nhập số địa điểm cho phép'
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='major_updates_months'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chu kỳ cập nhật chính (tháng)</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        placeholder='Nhập chu kỳ cập nhật tính theo tháng'
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='effective_from'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hiệu lực từ</FormLabel>
                    <FormControl>
                      <DatePicker
                        selected={field.value ? new Date(field.value) : undefined}
                        onSelect={(d) => field.onChange(d ? d.toISOString().split('T')[0] : '')}
                        placeholder='Chọn ngày bắt đầu'
                        allowFuture={true}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='effective_to'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hiệu lực đến</FormLabel>
                    <FormControl>
                      <DatePicker
                        selected={field.value ? new Date(field.value) : undefined}
                        onSelect={(d) => field.onChange(d ? d.toISOString().split('T')[0] : '')}
                        placeholder='Chọn ngày kết thúc'
                        allowFuture={true}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type='button' variant='outline' onClick={handleClose}>
                Hủy
              </Button>
              <Button type='submit' disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending
                  ? 'Đang lưu...'
                  : currentRow
                    ? 'Cập nhật gói'
                    : 'Tạo gói mới'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
