import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useState } from 'react';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import {
  CreateCaregiverInvitationRequest,
  useCreateCaregiverInvitation,
} from '@/services/caregiver-invitations';
import { useCaregivers } from '@/services/caregivers';

// import { usePatients } from '@/services/healthReports';

const createAssignmentSchema = z.object({
  caregiver_id: z.string().min(1, 'Vui lòng chọn người chăm sóc'),
  patient_id: z.string().min(1, 'Vui lòng chọn bệnh nhân'),
  assignment_notes: z.string().optional(),
});

type CreateAssignmentForm = z.infer<typeof createAssignmentSchema>;

interface CreateAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateAssignmentDialog({ open, onOpenChange }: CreateAssignmentDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createCaregiverInvitationMutation = useCreateCaregiverInvitation();

  const form = useForm<CreateAssignmentForm>({
    resolver: zodResolver(createAssignmentSchema),
    defaultValues: {
      caregiver_id: '',
      patient_id: '',
      assignment_notes: '',
    },
  });

  const { data: caregivers } = useCaregivers();
  // Temporarily comment out patients until the service is properly implemented
  // const { data: patients } = usePatients();

  const onSubmit = async (data: CreateAssignmentForm) => {
    setIsSubmitting(true);
    try {
      const payload: CreateCaregiverInvitationRequest = {
        caregiver_id: data.caregiver_id,
        patient_id: data.patient_id,
        assignment_notes: data.assignment_notes?.trim() || undefined,
      };

      await createCaregiverInvitationMutation.mutateAsync(payload);

      form.reset();
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
        form.reset();
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='sm:max-w-[600px]'>
        <DialogHeader>
          <DialogTitle>Tạo phân công mới</DialogTitle>
          <DialogDescription>Tạo phân công mới giữa người chăm sóc và bệnh nhân</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
            <div className='grid gap-6'>
              <FormField
                control={form.control}
                name='caregiver_id'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Người chăm sóc</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Chọn người chăm sóc' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {caregivers?.items?.map((caregiver) => (
                          <SelectItem key={caregiver.user_id} value={caregiver.user_id.toString()}>
                            {caregiver.full_name} ({caregiver.phone})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='patient_id'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bệnh nhân</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Chọn bệnh nhân' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {/* Temporarily disabled until patient service is implemented */}
                        <SelectItem value='patient1'>Bệnh nhân 1 (Demo)</SelectItem>
                        <SelectItem value='patient2'>Bệnh nhân 2 (Demo)</SelectItem>
                        {/* {patients?.map((patient) => (
                          <SelectItem key={patient.id} value={patient.id}>
                            {patient.full_name} ({patient.phone})
                          </SelectItem>
                        ))} */}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='assignment_notes'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ghi chú (tùy chọn)</FormLabel>
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
                Tạo phân công
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
