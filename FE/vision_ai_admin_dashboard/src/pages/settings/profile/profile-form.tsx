import { useFieldArray, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { useEffect } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';

import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
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
import { Textarea } from '@/components/ui/textarea';

import { cn } from '@/lib/utils';

import { getMyProfile, updateMyProfile } from '@/services/settings';

const profileFormSchema = z.object({
  username: z
    .string('Vui lòng nhập tên người dùng.')
    .min(2, 'Tên người dùng phải có ít nhất 2 ký tự.')
    .max(30, 'Tên người dùng không được dài quá 30 ký tự.'),
  email: z.email({
    error: (iss) => (iss.input === undefined ? 'Vui lòng chọn email hiển thị.' : undefined),
  }),
  bio: z.string().max(160).min(4),
  urls: z
    .array(
      z.object({
        value: z.url('Vui lòng nhập URL hợp lệ.'),
      })
    )
    .optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function ProfileForm() {
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: { username: '', email: '', bio: '', urls: [] },
    mode: 'onChange',
  });

  const { fields, append } = useFieldArray({
    name: 'urls',
    control: form.control,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['me-profile'],
    queryFn: () => getMyProfile(),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (data) {
      form.reset({
        username: data.username,
        email: data.email,
        bio: data.bio ?? '',
        urls: data.urls ?? [],
      });
    }
  }, [data, form]);

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (values: Partial<ProfileFormValues>) => updateMyProfile(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me-profile'], exact: false });
      toast.success('Cập nhật hồ sơ thành công');
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} className='space-y-8'>
        <FormField
          control={form.control}
          name='username'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tên hiển thị</FormLabel>
              <FormControl>
                <Input placeholder='ví dụ: ngoctruong' {...field} disabled={isLoading} />
              </FormControl>
              <FormDescription>
                Đây là tên hiển thị công khai của bạn. Có thể là tên thật hoặc bí danh. Bạn chỉ có
                thể thay đổi tên này mỗi 30 ngày.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='email'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email hiển thị</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder='Chọn email đã được xác minh để hiển thị' />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {field.value ? <SelectItem value={field.value}>{field.value}</SelectItem> : null}
                </SelectContent>
              </Select>
              <FormDescription>
                Bạn có thể quản lý các địa chỉ email đã xác minh trong{' '}
                <Link to='/'>cài đặt email</Link>.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='bio'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mô tả</FormLabel>
              <FormControl>
                <Textarea
                  placeholder='Mô tả ngắn về bạn'
                  className='resize-none'
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
              <FormDescription>
                Bạn có thể <span>@mention</span> người dùng hoặc tổ chức khác để liên kết tới họ.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div>
          {fields.map((field, index) => (
            <FormField
              control={form.control}
              key={field.id}
              name={`urls.${index}.value`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={cn(index !== 0 && 'sr-only')}>URLs</FormLabel>
                  <FormDescription className={cn(index !== 0 && 'sr-only')}>
                    Thêm liên kết tới trang web, blog hoặc các hồ sơ mạng xã hội của bạn.
                  </FormDescription>
                  <FormControl>
                    <Input {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='mt-2'
            onClick={() => append({ value: '' })}
            disabled={isLoading}
          >
            Thêm URL
          </Button>
        </div>
        <Button type='submit' disabled={mutation.isPending || isLoading}>
          {mutation.isPending ? 'Đang lưu…' : 'Cập nhật hồ sơ'}
        </Button>
      </form>
    </Form>
  );
}
