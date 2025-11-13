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

import { createUser, updateUser } from '@/services/users';

import { User } from '../data/schema';

// Danh sách vai trò cho UI
const userTypes = [
  { label: 'Khách hàng', value: 'customer' },
  { label: 'Người chăm sóc', value: 'caregiver' },
  { label: 'Admin', value: 'admin' },
  // Thêm các vai trò khác nếu cần
];

const formSchema = z
  .object({
    firstName: z.string().min(1, 'Tên là bắt buộc.'),
    lastName: z.string().min(1, 'Họ là bắt buộc.'),
    username: z.string().min(1, 'Tên đăng nhập là bắt buộc.'),
    phoneNumber: z.string().min(1, 'Số điện thoại là bắt buộc.'),
    email: z.email({
      error: (iss) => (iss.input === '' ? 'Email là bắt buộc.' : 'Email không hợp lệ.'),
    }),
    password: z.string().transform((pwd) => pwd.trim()),
    role: z.string().min(1, 'Vai trò là bắt buộc.'),
    confirmPassword: z.string().transform((pwd) => pwd.trim()),
    isEdit: z.boolean(),
  })
  .refine(
    (data) => {
      if (data.isEdit && !data.password) return true;
      return data.password.length > 0;
    },
    {
      message: 'Mật khẩu là bắt buộc.',
      path: ['password'],
    }
  )
  .refine(
    ({ isEdit, password }) => {
      if (isEdit && !password) return true;
      return password.length >= 6;
    },
    {
      message: 'Mật khẩu phải có ít nhất 6 ký tự.',
      path: ['password'],
    }
  )
  // .refine(
  //   ({ isEdit, password }) => {
  //     if (isEdit && !password) return true;
  //     return /[a-z]/.test(password);
  //   },
  //   {
  //     message: 'Mật khẩu phải chứa ít nhất một chữ thường.',
  //     path: ['password'],
  //   }
  // )
  .refine(
    ({ isEdit, password }) => {
      if (isEdit && !password) return true;
      return /\d/.test(password);
    },
    {
      message: 'Mật khẩu phải chứa ít nhất một số.',
      path: ['password'],
    }
  )
  .refine(
    ({ isEdit, password, confirmPassword }) => {
      if (isEdit && !password) return true;
      return password === confirmPassword;
    },
    {
      message: 'Mật khẩu xác nhận không khớp.',
      path: ['confirmPassword'],
    }
  );
type UserForm = z.infer<typeof formSchema>;

interface Props {
  currentRow?: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UsersActionDialog({ currentRow, open, onOpenChange }: Props) {
  const isEdit = !!currentRow;
  const queryClient = useQueryClient();
  const form = useForm<UserForm>({
    resolver: zodResolver(formSchema),
    defaultValues: isEdit
      ? {
          ...currentRow,
          password: '',
          confirmPassword: '',
          isEdit,
        }
      : {
          firstName: '',
          lastName: '',
          username: '',
          email: '',
          role: '',
          phoneNumber: '',
          password: '',
          confirmPassword: '',
          isEdit,
        },
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Mutation cho tạo mới user
  const createMutation = useMutation({
    mutationFn: async (values: UserForm) => {
      return createUser({
        username: values.username,
        email: values.email,
        phone_number: normalizePhoneTo84(values.phoneNumber),
        pin: values.password,
        full_name: `${values.lastName} ${values.firstName}`,
        role: values.role,
      });
    },
    onSuccess: () => {
      // Refresh danh sách users sau khi tạo thành công
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Người dùng đã được tạo thành công!');
    },
    onError: (_error) => {
      setErrorMsg('Có lỗi xảy ra khi tạo người dùng, vui lòng thử lại!');
      toast.error('Không thể tạo người dùng. Vui lòng kiểm tra lại dữ liệu.');
    },
  });

  // Mutation cho cập nhật user
  const updateMutation = useMutation({
    mutationFn: async (values: UserForm) => {
      if (!currentRow) throw new Error('Missing user');
      return updateUser(currentRow.user_id, {
        username: values.username,
        email: values.email,
        phone_number: normalizePhoneTo84(values.phoneNumber),
        password: values.password || undefined,
        full_name: `${values.lastName} ${values.firstName}`,
        role: values.role,
      });
    },
    onSuccess: () => {
      // Refresh danh sách users sau khi cập nhật thành công
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Người dùng đã được cập nhật thành công!');
    },
    onError: (_error) => {
      setErrorMsg('Có lỗi xảy ra khi cập nhật người dùng, vui lòng thử lại!');
      toast.error('Không thể cập nhật người dùng. Vui lòng kiểm tra lại dữ liệu.');
    },
  });

  const onSubmit = async (values: UserForm) => {
    setErrorMsg(null);
    try {
      if (isEdit) {
        await updateMutation.mutateAsync(values);
      } else {
        await createMutation.mutateAsync(values);
      }
      form.reset();
      onOpenChange(false);
    } catch (_err) {
      setErrorMsg('Có lỗi xảy ra, vui lòng thử lại!');
      toast.error(
        'Không thể lưu thông tin người dùng. Vui lòng kiểm tra lại dữ liệu hoặc thử lại sau.'
      );
    }
  };

  const isPasswordTouched = !!form.formState.dirtyFields.password;

  return (
    <Dialog
      open={open}
      onOpenChange={(state) => {
        form.reset();
        setErrorMsg(null);
        onOpenChange(state);
      }}
    >
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader className='text-left'>
          <DialogTitle>{isEdit ? 'Chỉnh sửa người dùng' : 'Thêm người dùng mới'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Cập nhật thông tin người dùng.' : 'Tạo người dùng mới.'}
            Nhấn lưu để hoàn tất.
          </DialogDescription>
        </DialogHeader>
        {errorMsg && <div className='mb-2 text-sm text-red-600'>{errorMsg}</div>}
        <div className='-mr-4 h-[26.25rem] w-full overflow-y-auto py-1 pr-4'>
          <Form {...form}>
            <form id='user-form' onSubmit={form.handleSubmit(onSubmit)} className='space-y-4 p-0.5'>
              {/* Họ */}
              <FormField
                control={form.control}
                name='lastName'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-right'>Họ</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='Nguyễn'
                        className='col-span-4'
                        autoComplete='off'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />
              {/* Tên */}
              <FormField
                control={form.control}
                name='firstName'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-right'>Tên</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='Văn A'
                        className='col-span-4'
                        autoComplete='off'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />
              {/* Tên đăng nhập */}
              <FormField
                control={form.control}
                name='username'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-right'>Tên đăng nhập</FormLabel>
                    <FormControl>
                      <Input placeholder='nguyenvana' className='col-span-4' {...field} />
                    </FormControl>
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />
              {/* Email */}
              <FormField
                control={form.control}
                name='email'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-right'>Email</FormLabel>
                    <FormControl>
                      <Input placeholder='nguyenvana@gmail.com' className='col-span-4' {...field} />
                    </FormControl>
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />
              {/* Số điện thoại */}
              <FormField
                control={form.control}
                name='phoneNumber'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-right'>Số điện thoại</FormLabel>
                    <FormControl>
                      <Input placeholder='+84901234567' className='col-span-4' {...field} />
                    </FormControl>
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />
              {/* Vai trò */}
              <FormField
                control={form.control}
                name='role'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-right'>Vai trò</FormLabel>
                    <SelectDropdown
                      defaultValue={field.value}
                      onValueChange={field.onChange}
                      placeholder='Chọn vai trò'
                      className='col-span-4'
                      items={userTypes.map(({ label, value }) => ({
                        label,
                        value,
                      }))}
                    />
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />
              {/* Mật khẩu */}
              <FormField
                control={form.control}
                name='password'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-right'>Mật khẩu</FormLabel>
                    <FormControl>
                      <PasswordInput
                        placeholder='Ví dụ: S3cur3P@ssw0rd'
                        className='col-span-4'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />
              {/* Xác nhận mật khẩu */}
              <FormField
                control={form.control}
                name='confirmPassword'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-right'>Xác nhận mật khẩu</FormLabel>
                    <FormControl>
                      <PasswordInput
                        disabled={!isPasswordTouched}
                        placeholder='Nhập lại mật khẩu'
                        className='col-span-4'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>
        <DialogFooter>
          <Button type='submit' form='user-form'>
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
