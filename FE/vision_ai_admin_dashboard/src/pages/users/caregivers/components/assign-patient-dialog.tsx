import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';

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

import { assignCaregiver } from '@/services/caregivers';

const formSchema = z.object({
  patientId: z.string().min(1, 'Mã bệnh nhân là bắt buộc.'),
  assignmentNotes: z.string().optional(),
});
type AssignPatientForm = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caregiverId: string | number;
}

export function AssignPatientDialog({ open, onOpenChange, caregiverId }: Props) {
  const form = useForm<AssignPatientForm>({
    resolver: zodResolver(formSchema),
    defaultValues: { patientId: '', assignmentNotes: '' },
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (values: AssignPatientForm) => {
      return assignCaregiver({
        caregiver_id: String(caregiverId),
        patient_id: values.patientId,
        assignment_notes: values.assignmentNotes,
      });
    },
    onSuccess: () => {
      // refresh caregiver lists and related user caches
      queryClient.invalidateQueries({ queryKey: ['caregivers'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['users'], exact: false });
    },
  });

  const onSubmit = () => {
    setErrorMsg(null);
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    try {
      await mutation.mutateAsync(form.getValues());
      form.reset();
      setConfirmOpen(false);
      onOpenChange(false);
      toast.success('Gán bệnh nhân thành công!');
    } catch (_err) {
      setErrorMsg('Có lỗi xảy ra, vui lòng thử lại!');
      setConfirmOpen(false);
      toast.error('Không thể gán bệnh nhân.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Gán bệnh nhân cho người chăm sóc</DialogTitle>
        </DialogHeader>
        {errorMsg && <div className='mb-2 text-sm text-red-600'>{errorMsg}</div>}
        <Form {...form}>
          <form
            id='assign-patient-form'
            onSubmit={form.handleSubmit(onSubmit)}
            className='space-y-4'
          >
            <FormField
              control={form.control}
              name='patientId'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mã bệnh nhân</FormLabel>
                  <FormControl>
                    <Input placeholder='Nhập mã bệnh nhân' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='assignmentNotes'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ghi chú (tuỳ chọn)</FormLabel>
                  <FormControl>
                    <Input placeholder='Ghi chú' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <DialogFooter>
          <Button type='submit' form='assign-patient-form' disabled={mutation.status === 'pending'}>
            {mutation.status === 'pending' ? 'Đang gửi...' : 'Gán'}
          </Button>
        </DialogFooter>
        {confirmOpen && (
          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <DialogContent className='sm:max-w-xs'>
              <DialogHeader>
                <DialogTitle>Xác nhận gán bệnh nhân</DialogTitle>
              </DialogHeader>
              <div className='mb-4 text-sm'>
                Bạn có chắc chắn muốn gán bệnh nhân <b>{form.getValues().patientId}</b> cho người
                chăm sóc này?
              </div>
              <DialogFooter>
                <Button onClick={handleConfirm} disabled={mutation.status === 'pending'}>
                  {mutation.status === 'pending' ? 'Đang gửi...' : 'Xác nhận'}
                </Button>
                <Button
                  variant='outline'
                  onClick={() => setConfirmOpen(false)}
                  disabled={mutation.status === 'pending'}
                >
                  Huỷ
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}
