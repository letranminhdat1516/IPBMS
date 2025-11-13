import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { useEffect } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';

import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';

import { getMyNotificationsPref, updateMyNotificationsPref } from '@/services/settings';

const notificationsFormSchema = z.object({
  type: z.enum(['all', 'mentions', 'none'], {
    error: (iss) => (iss.input === undefined ? 'Vui lòng chọn loại thông báo.' : undefined),
  }),
  mobile: z.boolean().default(false).optional(),
  communication_emails: z.boolean().default(false).optional(),
  social_emails: z.boolean().default(false).optional(),
  marketing_emails: z.boolean().default(false).optional(),
  security_emails: z.boolean(),
});

type NotificationsFormValues = z.infer<typeof notificationsFormSchema>;

export function NotificationsForm() {
  const form = useForm<NotificationsFormValues>({
    resolver: zodResolver(notificationsFormSchema),
    defaultValues: {
      type: 'all',
      communication_emails: false,
      marketing_emails: false,
      social_emails: false,
      security_emails: true,
      mobile: false,
    },
  });
  const { data, isLoading } = useQuery({
    queryKey: ['me-notifications'],
    queryFn: () => getMyNotificationsPref(),
    staleTime: 60_000,
  });
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (values: NotificationsFormValues) => updateMyNotificationsPref(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me-notifications'], exact: false });
      toast.success('Cập nhật cài đặt thông báo thành công');
    },
  });

  // Initialize form when data arrives
  useEffect(() => {
    if (data && !form.formState.isDirty) {
      form.reset({
        type: data.type,
        mobile: !!data.mobile,
        communication_emails: !!data.communication_emails,
        social_emails: !!data.social_emails,
        marketing_emails: !!data.marketing_emails,
        security_emails: !!data.security_emails,
      });
    }
  }, [data, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} className='space-y-8'>
        <FormField
          control={form.control}
          name='type'
          render={({ field }) => (
            <FormItem className='relative space-y-3'>
              <FormLabel>Thông báo cho tôi về...</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className='flex flex-col space-y-1'
                >
                  <FormItem className='flex items-center space-y-0 space-x-3'>
                    <FormControl>
                      <RadioGroupItem value='all' />
                    </FormControl>
                    <FormLabel className='font-normal'>Mọi tin nhắn mới</FormLabel>
                  </FormItem>
                  <FormItem className='flex items-center space-y-0 space-x-3'>
                    <FormControl>
                      <RadioGroupItem value='mentions' />
                    </FormControl>
                    <FormLabel className='font-normal'>Tin nhắn trực tiếp và đề cập</FormLabel>
                  </FormItem>
                  <FormItem className='flex items-center space-y-0 space-x-3'>
                    <FormControl>
                      <RadioGroupItem value='none' />
                    </FormControl>
                    <FormLabel className='font-normal'>Không gì cả</FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className='relative'>
          <h3 className='mb-4 text-lg font-medium'>Thông báo Email</h3>
          <div className='space-y-4'>
            <FormField
              control={form.control}
              name='communication_emails'
              render={({ field }) => (
                <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                  <div className='space-y-0.5'>
                    <FormLabel className='text-base'>Email thông báo</FormLabel>
                    <FormDescription>Nhận email về hoạt động tài khoản của bạn.</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='marketing_emails'
              render={({ field }) => (
                <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                  <div className='space-y-0.5'>
                    <FormLabel className='text-base'>Email marketing</FormLabel>
                    <FormDescription>
                      Nhận email về sản phẩm mới, tính năng và thông tin khác.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='social_emails'
              render={({ field }) => (
                <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                  <div className='space-y-0.5'>
                    <FormLabel className='text-base'>Email xã hội</FormLabel>
                    <FormDescription>
                      Nhận email về lời mời kết bạn, theo dõi và các thông báo xã hội khác.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='security_emails'
              render={({ field }) => (
                <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                  <div className='space-y-0.5'>
                    <FormLabel className='text-base'>Email bảo mật</FormLabel>
                    <FormDescription>
                      Nhận email liên quan tới hoạt động và bảo mật tài khoản.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled
                      aria-readonly
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </div>
        <FormField
          control={form.control}
          name='mobile'
          render={({ field }) => (
            <FormItem className='relative flex flex-row items-start space-y-0 space-x-3'>
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <div className='space-y-1 leading-none'>
                <FormLabel>Sử dụng cài đặt khác cho thiết bị di động</FormLabel>
                <FormDescription>
                  Bạn có thể quản lý thông báo trên di động trong trang{' '}
                  <Link
                    to='/settings'
                    className='underline decoration-dashed underline-offset-4 hover:decoration-solid'
                  >
                    cài đặt di động
                  </Link>
                  .
                </FormDescription>
              </div>
            </FormItem>
          )}
        />
        <Button type='submit' disabled={mutation.isPending || isLoading}>
          {mutation.isPending ? 'Đang lưu…' : 'Cập nhật thông báo'}
        </Button>
      </form>
    </Form>
  );
}
