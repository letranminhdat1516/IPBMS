import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
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

import { useUpdateAdminUserQuota } from '@/services/quota';

const schema = z.object({
  camera_quota: z.number().min(0),
  retention_days: z.number().min(0),
  caregiver_seats: z.number().min(0),
  sites: z.number().min(0),
  max_storage_gb: z.number().min(0),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | number;
  defaultValues: Partial<FormValues>;
}

export default function UpdateQuotaDialog({ open, onOpenChange, userId, defaultValues }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const mutation = useUpdateAdminUserQuota();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      camera_quota: defaultValues.camera_quota ?? 0,
      retention_days: defaultValues.retention_days ?? 0,
      caregiver_seats: defaultValues.caregiver_seats ?? 0,
      sites: defaultValues.sites ?? 0,
      max_storage_gb: defaultValues.max_storage_gb ?? 0,
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      await mutation.mutateAsync({ userId, body: values });
      toast.success('Cập nhật quota thành công');
      onOpenChange(false);
    } catch (_err) {
      toast.error('Có lỗi xảy ra khi cập nhật quota');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[520px]'>
        <DialogHeader>
          <DialogTitle>Chỉnh sửa Quota người dùng</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='camera_quota'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Camera Quota</FormLabel>
                  <FormControl>
                    <Input type='number' {...field} />
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
                  <FormLabel>Retention (ngày)</FormLabel>
                  <FormControl>
                    <Input type='number' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='caregiver_seats'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Caregiver Seats</FormLabel>
                  <FormControl>
                    <Input type='number' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='sites'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sites</FormLabel>
                  <FormControl>
                    <Input type='number' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='max_storage_gb'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Storage (GB)</FormLabel>
                  <FormControl>
                    <Input type='number' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                variant='outline'
                type='button'
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Hủy
              </Button>
              <Button type='submit' disabled={isSubmitting}>
                {isSubmitting && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                Lưu
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
