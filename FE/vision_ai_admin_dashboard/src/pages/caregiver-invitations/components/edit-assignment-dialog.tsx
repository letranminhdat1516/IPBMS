import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useEffect, useState } from 'react';

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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

import {
  CaregiverInvitation,
  UpdateCaregiverInvitationRequest,
  useUpdateCaregiverInvitation,
} from '@/services/caregiver-invitations';

const editAssignmentSchema = z.object({
  assignment_notes: z.string().optional(),
  is_active: z.boolean(),
});

type EditAssignmentForm = z.infer<typeof editAssignmentSchema>;

interface EditAssignmentDialogProps {
  assignment: CaregiverInvitation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditAssignmentDialog({
  assignment,
  open,
  onOpenChange,
}: EditAssignmentDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const updateCaregiverInvitationMutation = useUpdateCaregiverInvitation();

  const form = useForm<EditAssignmentForm>({
    resolver: zodResolver(editAssignmentSchema),
    defaultValues: {
      assignment_notes: assignment.assignment_notes || '',
      is_active: assignment.is_active,
    },
  });

  // Update form when assignment changes
  useEffect(() => {
    form.reset({
      assignment_notes: assignment.assignment_notes || '',
      is_active: assignment.is_active,
    });
  }, [assignment, form]);

  const onSubmit = async (data: EditAssignmentForm) => {
    setIsSubmitting(true);
    try {
      const payload: UpdateCaregiverInvitationRequest = {
        assignment_notes: data.assignment_notes?.trim() || undefined,
        is_active: data.is_active,
      };

      await updateCaregiverInvitationMutation.mutateAsync({
        assignment_id: assignment.assignment_id,
        data: payload,
      });

      onOpenChange(false);
    } catch (_error) {
      // Error handling will be managed by the mutation
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isSubmitting) {
      onOpenChange(newOpen);
      if (!newOpen) {
        form.reset({
          assignment_notes: assignment.assignment_notes || '',
          is_active: assignment.is_active,
        });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='sm:max-w-[600px]'>
        <DialogHeader>
          <DialogTitle>Chỉnh sửa phân công</DialogTitle>
          <DialogDescription>
            Cập nhật thông tin phân công giữa {assignment.caregiver_name || 'người chăm sóc'} và{' '}
            {assignment.patient_name || 'bệnh nhân'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
            <div className='grid gap-6'>
              {/* Assignment Info */}
              <div className='bg-muted/50 space-y-2 rounded-lg p-4'>
                <div className='text-sm font-medium'>Thông tin phân công</div>
                <div className='text-muted-foreground text-sm'>
                  <div>ID: {assignment.assignment_id.slice(0, 8)}...</div>
                  <div>Người chăm sóc: {assignment.caregiver_name || 'N/A'}</div>
                  <div>Bệnh nhân: {assignment.patient_name || 'N/A'}</div>
                  <div>
                    Ngày phân công: {new Date(assignment.assigned_at).toLocaleDateString('vi-VN')}
                  </div>
                </div>
              </div>

              <FormField
                control={form.control}
                name='is_active'
                render={({ field }) => (
                  <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                    <div className='space-y-0.5'>
                      <FormLabel className='text-base'>Trạng thái hoạt động</FormLabel>
                      <div className='text-muted-foreground text-sm'>
                        Bật/tắt trạng thái hoạt động của phân công này
                      </div>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='assignment_notes'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ghi chú</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='Nhập ghi chú về phân công này...'
                        className='min-h-[100px]'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                Hủy
              </Button>
              <Button type='submit' disabled={isSubmitting}>
                {isSubmitting && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                Cập nhật
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
