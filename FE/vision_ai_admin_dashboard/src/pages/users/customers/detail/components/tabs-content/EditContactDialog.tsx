import { useForm } from 'react-hook-form';

import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

import { normalizePhoneTo84 } from '@/lib/utils';

import { useCreateEmergencyContact, useUpdateEmergencyContact } from '@/services/userDetail';

type EditContactDialogProps = {
  userId: string | number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: { id?: string; name?: string; relation?: string; phone?: string } | null;
  onSuccess?: () => void;
};

type FormValues = { name: string; relation: string; phone: string };

export default function EditContactDialog({
  userId,
  open,
  onOpenChange,
  initial,
  onSuccess,
}: EditContactDialogProps) {
  const form = useForm<FormValues>({
    defaultValues: {
      name: initial?.name ?? '',
      relation: initial?.relation ?? '',
      phone: initial?.phone ?? '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: initial?.name ?? '',
        relation: initial?.relation ?? '',
        phone: initial?.phone ?? '',
      });
    }
  }, [open, form, initial?.name, initial?.relation, initial?.phone]);

  const createMu = useCreateEmergencyContact(userId);
  const updateMu = useUpdateEmergencyContact(userId);

  const onSubmit = async (values: FormValues) => {
    const normalized = { ...values, phone: normalizePhoneTo84(values.phone) };
    if (initial?.id) {
      await updateMu.mutateAsync({ contactId: initial.id, body: normalized });
    } else {
      await createMu.mutateAsync(normalized);
    }
    onOpenChange(false);
    onSuccess?.();
  };

  const isPending = createMu.isPending || updateMu.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {initial?.id ? 'Sửa liên hệ khẩn cấp' : 'Thêm liên hệ khẩn cấp'}
          </DialogTitle>
          <DialogDescription>Nhập tên, mối quan hệ và số điện thoại</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Họ tên</FormLabel>
                  <FormControl>
                    <Input placeholder='Trần Thị B' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='relation'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mối quan hệ</FormLabel>
                  <FormControl>
                    <Input placeholder='Con gái / Người chăm sóc' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='phone'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Số điện thoại</FormLabel>
                  <FormControl>
                    <Input placeholder='0912 345 678' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className='flex justify-end gap-2'>
              <Button
                type='button'
                variant='outline'
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Hủy
              </Button>
              <Button type='submit' disabled={isPending}>
                Lưu
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
