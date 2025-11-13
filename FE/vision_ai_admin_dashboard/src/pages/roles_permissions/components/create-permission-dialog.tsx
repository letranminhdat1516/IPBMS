import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Textarea } from '@/components/ui/textarea';

import { type CreatePermissionRequest, createPermission } from '@/services/roles';

interface CreatePermissionDialogProps {
  children: React.ReactNode;
}

interface FormData {
  name: string;
  description: string;
}

export function CreatePermissionDialog({ children }: CreatePermissionDialogProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const createPermissionMutation = useMutation({
    mutationFn: createPermission,
    onSuccess: () => {
      toast.success('Tạo permission thành công');
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      setOpen(false);
      form.reset();
    },
    onError: () => {
      toast.error('Có lỗi xảy ra khi tạo permission');
    },
  });

  const onSubmit = (data: FormData) => {
    const payload: CreatePermissionRequest = {
      name: data.name,
      description: data.description || undefined,
    };
    createPermissionMutation.mutate(payload);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className='max-w-md'>
        <DialogHeader>
          <DialogTitle>Tạo Permission Mới</DialogTitle>
          <DialogDescription>Tạo quyền truy cập mới cho hệ thống</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='name'
              rules={{ required: 'Tên permission là bắt buộc' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên Permission</FormLabel>
                  <FormControl>
                    <Input placeholder='Ví dụ: read:events, create:users...' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='description'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mô tả (Tùy chọn)</FormLabel>
                  <FormControl>
                    <Textarea placeholder='Mô tả về permission này...' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className='flex justify-end space-x-2'>
              <Button type='button' variant='outline' onClick={() => setOpen(false)}>
                Hủy
              </Button>
              <Button type='submit' disabled={createPermissionMutation.isPending}>
                {createPermissionMutation.isPending ? 'Đang tạo...' : 'Tạo Permission'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
