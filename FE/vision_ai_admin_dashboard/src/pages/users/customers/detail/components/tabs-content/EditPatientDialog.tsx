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

import { useUpsertUserMedicalInfo } from '@/services/userDetail';

type EditPatientDialogProps = {
  userId: string | number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: { name?: string; dob?: string | null } | null;
  onSuccess?: () => void;
};

type FormValues = { name: string; dob: string };

export default function EditPatientDialog({
  userId,
  open,
  onOpenChange,
  initial,
  onSuccess,
}: EditPatientDialogProps) {
  const form = useForm<FormValues>({
    defaultValues: { name: initial?.name ?? '', dob: initial?.dob ?? '' },
  });

  useEffect(() => {
    if (open) {
      form.reset({ name: initial?.name ?? '', dob: initial?.dob ?? '' });
    }
  }, [open, form, initial?.name, initial?.dob]);

  const upsert = useUpsertUserMedicalInfo(userId);

  const onSubmit = async (values: FormValues) => {
    await upsert.mutateAsync({
      patient: { name: values.name || undefined, dob: values.dob || null },
    });
    onOpenChange(false);
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Chỉnh sửa hồ sơ bệnh nhân</DialogTitle>
          <DialogDescription>Cập nhật tên và ngày sinh</DialogDescription>
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
                    <Input placeholder='Nguyễn Văn A' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='dob'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ngày sinh (YYYY-MM-DD)</FormLabel>
                  <FormControl>
                    <Input placeholder='1950-01-01' {...field} />
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
                disabled={upsert.isPending}
              >
                Hủy
              </Button>
              <Button type='submit' disabled={upsert.isPending}>
                Lưu
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
