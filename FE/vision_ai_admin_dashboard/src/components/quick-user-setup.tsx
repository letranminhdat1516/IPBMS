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
  DialogDescription,
  DialogFooter,
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

import { PasswordInput } from '@/components/password-input';
import { SelectDropdown } from '@/components/select-dropdown';

import { normalizePhoneTo84 } from '@/lib/utils';

import { createUser, inviteUser } from '@/services/users';

const userTypes = [
  { label: 'Khách hàng', value: 'customer' },
  { label: 'Người chăm sóc', value: 'caregiver' },
  { label: 'Admin', value: 'admin' },
];

const formSchema = z.object({
  firstName: z.string().min(1, 'Tên là bắt buộc'),
  lastName: z.string().min(1, 'Họ là bắt buộc'),
  username: z.string().min(1, 'Tên đăng nhập là bắt buộc'),
  email: z.string().email('Email không hợp lệ'),
  phoneNumber: z.string().min(1, 'Số điện thoại là bắt buộc'),
  role: z.string().min(1, 'Vai trò là bắt buộc'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  sendInvite: z.boolean(),
});

type UserForm = z.infer<typeof formSchema>;

interface QuickUserSetupProps {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function QuickUserSetup({ trigger, onSuccess }: QuickUserSetupProps) {
  const [open, setOpen] = useState(false);
  const [sendInvite, setSendInvite] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<UserForm>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      username: '',
      email: '',
      phoneNumber: '',
      role: 'customer',
      password: '',
      sendInvite: false,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: UserForm) => {
      if (sendInvite) {
        return inviteUser({
          email: values.email,
          role: values.role,
          desc: `Mời ${values.firstName} ${values.lastName} tham gia hệ thống`,
        });
      } else {
        return createUser({
          username: values.username,
          email: values.email,
          phone_number: normalizePhoneTo84(values.phoneNumber),
          pin: values.password,
          full_name: `${values.lastName} ${values.firstName}`,
          role: values.role,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(sendInvite ? 'Email mời đã được gửi!' : 'Người dùng đã được tạo thành công!');
      setOpen(false);
      form.reset();
      onSuccess?.();
    },
    onError: (_error) => {
      toast.error(sendInvite ? 'Không thể gửi email mời' : 'Không thể tạo người dùng');
    },
  });

  const onSubmit = (values: UserForm) => {
    createMutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant='default' size='sm'>
            Thêm người dùng
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle>Tạo người dùng mới</DialogTitle>
          <DialogDescription>
            Thêm người dùng mới vào hệ thống với thông tin cơ bản
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='lastName'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Họ</FormLabel>
                    <FormControl>
                      <Input placeholder='Nguyễn' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='firstName'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên</FormLabel>
                    <FormControl>
                      <Input placeholder='Văn A' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name='username'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên đăng nhập</FormLabel>
                  <FormControl>
                    <Input placeholder='nguyenvana' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='email'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type='email' placeholder='nguyenvana@example.com' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='phoneNumber'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Số điện thoại</FormLabel>
                  <FormControl>
                    <Input placeholder='0987654321' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='role'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vai trò</FormLabel>
                  <SelectDropdown
                    defaultValue={field.value}
                    onValueChange={field.onChange}
                    items={userTypes}
                    placeholder='Chọn vai trò'
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            {!sendInvite && (
              <FormField
                control={form.control}
                name='password'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mật khẩu</FormLabel>
                    <FormControl>
                      <PasswordInput placeholder='Mật khẩu ít nhất 6 ký tự' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className='flex items-center space-x-2'>
              <input
                type='checkbox'
                id='sendInvite'
                checked={sendInvite}
                onChange={(e) => setSendInvite(e.target.checked)}
                className='rounded'
              />
              <label htmlFor='sendInvite' className='text-sm'>
                Gửi email mời thay vì tạo tài khoản ngay
              </label>
            </div>

            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => setOpen(false)}
                disabled={createMutation.isPending}
              >
                Hủy
              </Button>
              <Button type='submit' disabled={createMutation.isPending}>
                {createMutation.isPending
                  ? sendInvite
                    ? 'Đang gửi...'
                    : 'Đang tạo...'
                  : sendInvite
                    ? 'Gửi mời'
                    : 'Tạo người dùng'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
