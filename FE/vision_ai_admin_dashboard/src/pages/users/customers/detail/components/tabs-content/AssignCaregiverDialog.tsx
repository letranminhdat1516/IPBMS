import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { useEffect, useMemo, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { maskEmail, maskName, maskPhoneNumber, normalizePhoneTo84 } from '@/lib/utils';

import type { Caregiver } from '@/types/user';

import { handleServerError } from '@/utils/handle-server-error';

import { createCaregiverInvitation } from '@/services/caregiver-invitations';
import { useCaregivers } from '@/services/caregivers';

type AssignCaregiverDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId?: string | number | null;
};

type FormValues = { caregiver_id: string };

export default function AssignCaregiverDialog({
  open,
  onOpenChange,
  patientId,
}: AssignCaregiverDialogProps) {
  const form = useForm<FormValues>({ defaultValues: { caregiver_id: '' } });
  const qc = useQueryClient();
  useEffect(() => {
    if (!open) form.reset({ caregiver_id: '' });
  }, [open, form]);

  const { data } = useCaregivers({ page: 1, limit: 50 });
  const caregivers: Caregiver[] = useMemo(() => {
    return (Array.isArray(data) ? data : (data?.items ?? [])) as Caregiver[];
  }, [data]);
  const [search, setSearch] = useState('');
  const filteredCaregivers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return caregivers;
    return caregivers.filter((c) =>
      [c.full_name, c.email, c.phone].some((v) => (v ?? '').toLowerCase().includes(q))
    );
  }, [caregivers, search]);

  const onSubmit = async (values: FormValues) => {
    if (!patientId) return;
    if (!values.caregiver_id) {
      form.setError('caregiver_id', {
        type: 'required',
        message: 'Vui lòng chọn người chăm sóc',
      });
      return;
    }
    try {
      await createCaregiverInvitation({
        caregiver_id: values.caregiver_id,
        patient_id: String(patientId),
      });
      toast.success('Đã gán người chăm sóc.');
      // refresh assignments for this patient
      await qc.invalidateQueries({ queryKey: ['assignments', { patient_id: String(patientId) }] });
      onOpenChange(false);
    } catch (err) {
      handleServerError(err);
    }
  };

  const disabled = !patientId || caregivers.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gán người chăm sóc</DialogTitle>
          <DialogDescription>Chọn người chăm sóc để gán cho bệnh nhân.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <div>
              <Input
                placeholder='Tìm kiếm người chăm sóc (tên, email, SĐT)'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <FormField
              control={form.control}
              name='caregiver_id'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Người chăm sóc</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange} disabled={disabled}>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            disabled
                              ? 'Chưa có bệnh nhân hoặc danh sách rỗng'
                              : 'Chọn người chăm sóc'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredCaregivers.map((c) => {
                          const contact = c.email
                            ? maskEmail(c.email)
                            : c.phone
                              ? maskPhoneNumber(normalizePhoneTo84(c.phone))
                              : '';
                          return (
                            <SelectItem key={String(c.user_id)} value={String(c.user_id)}>
                              <div className='flex items-center justify-between gap-2'>
                                <span>
                                  {maskName(c.full_name)} — {contact}
                                </span>
                                <span
                                  className={
                                    c.status === 'approved'
                                      ? 'text-[10px] font-semibold text-green-600'
                                      : c.status === 'pending'
                                        ? 'text-[10px] font-semibold text-yellow-600'
                                        : 'text-[10px] font-semibold text-red-600'
                                  }
                                >
                                  {c.status.toUpperCase()}
                                </span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className='flex justify-end gap-2'>
              <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
                Hủy
              </Button>
              <Button type='submit' disabled={disabled || form.formState.isSubmitting}>
                Gán
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
