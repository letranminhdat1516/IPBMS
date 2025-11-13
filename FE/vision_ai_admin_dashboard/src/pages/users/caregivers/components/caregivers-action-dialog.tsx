import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { useRef, useState } from 'react';

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

import { ConfirmDialog } from '@/components/confirm-dialog';
import { PasswordInput } from '@/components/password-input';
import { SelectDropdown } from '@/components/select-dropdown';

import { normalizePhoneTo84 } from '@/lib/utils';

import { Caregiver } from '@/types/user';

import { createCaregiver, updateCaregiver } from '@/services/caregivers';
import { useUploadFile } from '@/services/uploads';

const formSchema = z.object({
  fullName: z.string().min(1, 'Họ tên là bắt buộc.'),
  username: z.string().min(1, 'Tên đăng nhập là bắt buộc.'),
  email: z.email({
    error: (iss) => (iss.input === '' ? 'Email là bắt buộc.' : 'Email không hợp lệ.'),
  }),
  phoneNumber: z.string().min(1, 'Số điện thoại là bắt buộc.'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự.'),
  role: z.string().min(1, 'Vai trò là bắt buộc.'),
  status: z.enum(['pending', 'approved', 'rejected']),
  avatar: z.string().optional(),
  address: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  date_of_birth: z.string().optional(),
  verified: z.boolean().optional(),
  is_active: z.boolean().optional(),
  isEdit: z.boolean(),
});
type CaregiverForm = z.infer<typeof formSchema>;

interface Props {
  currentRow?: Caregiver;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dialogProps?: Partial<React.ComponentProps<typeof ConfirmDialog>>;
}

export function CaregiversActionDialog({ currentRow, open, onOpenChange, dialogProps }: Props) {
  const isEdit = !!currentRow;
  const form = useForm<CaregiverForm>({
    resolver: zodResolver(formSchema),
    defaultValues: isEdit
      ? {
          fullName: currentRow?.full_name ?? '',
          username: currentRow?.username ?? '',
          email: currentRow?.email ?? '',
          phoneNumber: currentRow?.phone ?? '',
          password: '',
          role: currentRow?.role ?? 'caregiver',
          status: currentRow?.status ?? 'pending',
          avatar: currentRow?.avatar ?? '',
          address: currentRow?.address ?? '',
          gender: currentRow?.gender ?? undefined,
          date_of_birth: currentRow?.date_of_birth ?? '',
          verified: currentRow?.verified ?? false,
          is_active: currentRow?.is_active ?? true,
          isEdit,
        }
      : {
          fullName: '',
          username: '',
          email: '',
          phoneNumber: '',
          password: '',
          role: 'caregiver',
          status: 'pending',
          avatar: '',
          address: '',
          gender: undefined,
          date_of_birth: '',
          verified: false,
          is_active: true,
          isEdit,
        },
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const upload = useUploadFile();

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (values: CaregiverForm) => {
      return createCaregiver({
        username: values.username,
        email: values.email,
        phone: normalizePhoneTo84(values.phoneNumber),
        pin: values.password,
        full_name: values.fullName,
        role: values.role,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caregivers'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: CaregiverForm) => {
      if (!currentRow) throw new Error('Missing caregiver');
      return updateCaregiver(currentRow.user_id, {
        username: values.username,
        email: values.email,
        phone_number: normalizePhoneTo84(values.phoneNumber),
        pin: values.password || undefined,
        full_name: values.fullName,
        role: values.role,
        status: values.status,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caregivers'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const onSubmit = async (values: CaregiverForm) => {
    setErrorMsg(null);
    try {
      if (isEdit) {
        await updateMutation.mutateAsync(values);
      } else {
        await createMutation.mutateAsync(values);
      }
      form.reset();
      onOpenChange(false);
      toast.success(isEdit ? 'Cập nhật thành công!' : 'Thêm mới thành công!');
    } catch (_err) {
      setErrorMsg('Có lỗi xảy ra, vui lòng thử lại!');
      toast.error('Không thể lưu thông tin. Vui lòng kiểm tra lại dữ liệu hoặc thử lại sau.');
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(state) => {
        form.reset();
        setErrorMsg(null);
        onOpenChange(state);
      }}
      {...dialogProps}
    >
      <DialogContent
        className={!dialogProps?.style ? 'sm:max-w-lg' : undefined}
        style={dialogProps?.style}
      >
        <DialogHeader className='text-left'>
          <DialogTitle>
            {isEdit ? 'Chỉnh sửa người chăm sóc' : 'Thêm người chăm sóc mới'}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? 'Cập nhật thông tin người chăm sóc.' : 'Tạo người chăm sóc mới.'}
            Nhấn lưu để hoàn tất.
          </DialogDescription>
        </DialogHeader>
        {errorMsg && <div className='mb-2 text-sm text-red-600'>{errorMsg}</div>}
        <div className='-mr-4 w-full overflow-y-auto py-1 pr-4'>
          <Form {...form}>
            <form
              id='caregiver-form'
              onSubmit={form.handleSubmit(onSubmit)}
              className='space-y-4 p-0.5'
            >
              <FormField
                control={form.control}
                name='fullName'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Họ tên</FormLabel>
                    <FormControl>
                      <Input placeholder='Nguyễn Văn A' autoComplete='off' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='username'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên đăng nhập</FormLabel>
                    <FormControl>
                      <Input placeholder='nguyenvana' autoComplete='off' {...field} />
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
                      <Input placeholder='nguyenvana@gmail.com' autoComplete='off' {...field} />
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
                      <Input placeholder='+84901234567' autoComplete='off' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='password'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mật khẩu</FormLabel>
                    <FormControl>
                      <PasswordInput placeholder='Nhập mật khẩu' {...field} />
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
                      placeholder='Chọn vai trò'
                      items={[{ label: 'Người chăm sóc', value: 'caregiver' }]}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='status'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trạng thái</FormLabel>
                    <SelectDropdown
                      defaultValue={field.value}
                      onValueChange={field.onChange}
                      placeholder='Chọn trạng thái'
                      items={[
                        { label: 'Chờ duyệt', value: 'pending' },
                        { label: 'Đã duyệt', value: 'approved' },
                        { label: 'Từ chối', value: 'rejected' },
                      ]}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='avatar'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ảnh đại diện (URL)</FormLabel>
                    <FormControl>
                      <div className='flex items-center gap-2'>
                        <Input placeholder='https://...' autoComplete='off' {...field} />
                        <input
                          ref={fileInputRef}
                          type='file'
                          accept='image/*'
                          className='hidden'
                          onChange={async (e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            try {
                              const fileUrl = await upload.mutateAsync({
                                file: f,
                                filename: f.name,
                                content_type: f.type,
                                purpose: 'avatar',
                              });
                              field.onChange(String(fileUrl));
                              toast.success('Tải ảnh lên thành công');
                            } catch (_err) {
                              toast.error('Không thể tải ảnh lên. Vui lòng thử lại.');
                            } finally {
                              // clear input so same file can be selected again
                              if (fileInputRef.current) fileInputRef.current.value = '';
                            }
                          }}
                        />
                        <button
                          type='button'
                          className='btn btn-outline'
                          onClick={() => fileInputRef.current?.click()}
                          disabled={upload.status === 'pending'}
                        >
                          {upload.status === 'pending' ? 'Đang tải...' : 'Tải lên'}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='address'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Địa chỉ</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='Số nhà, đường, quận/huyện...'
                        autoComplete='off'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='gender'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Giới tính</FormLabel>
                    <SelectDropdown
                      defaultValue={field.value}
                      onValueChange={field.onChange}
                      placeholder='Chọn giới tính'
                      items={[
                        { label: 'Nam', value: 'male' },
                        { label: 'Nữ', value: 'female' },
                        { label: 'Khác', value: 'other' },
                      ]}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='date_of_birth'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ngày sinh</FormLabel>
                    <FormControl>
                      <Input type='date' placeholder='YYYY-MM-DD' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>
        <DialogFooter>
          <Button type='submit' form='caregiver-form'>
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
