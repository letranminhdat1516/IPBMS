import { Clock, Loader2, Lock, Shield } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';

import { useSecuritySettings, useUpdateSecuritySettings } from '@/services/system';

const securitySettingsSchema = z.object({
  passwordPolicy: z.object({
    minLength: z.number().min(6).max(128),
    requireUppercase: z.boolean(),
    requireLowercase: z.boolean(),
    requireNumbers: z.boolean(),
    requireSpecialChars: z.boolean(),
    expirationDays: z.number().min(0).max(365),
  }),
  sessionSettings: z.object({
    maxSessionDuration: z.number().min(1).max(2880), // Max 2 days in minutes
    inactivityTimeout: z.number().min(5).max(480), // Max 8 hours in minutes
    maxConcurrentSessions: z.number().min(1).max(10),
  }),
  twoFactorAuth: z.object({
    enabled: z.boolean(),
    required: z.boolean(),
    backupCodes: z.boolean(),
  }),
});

type SecuritySettingsForm = z.infer<typeof securitySettingsSchema>;

export function SecurityTab() {
  const { data: securitySettings, isLoading } = useSecuritySettings();
  const updateSecurityMutation = useUpdateSecuritySettings();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SecuritySettingsForm>({
    resolver: zodResolver(securitySettingsSchema),
    values: securitySettings || {
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: false,
        expirationDays: 90,
      },
      sessionSettings: {
        maxSessionDuration: 480, // 8 hours
        inactivityTimeout: 30,
        maxConcurrentSessions: 3,
      },
      twoFactorAuth: {
        enabled: false,
        required: false,
        backupCodes: true,
      },
    },
  });

  const onSubmit = async (data: SecuritySettingsForm) => {
    setIsSubmitting(true);
    try {
      await updateSecurityMutation.mutateAsync(data);
      toast.success('Cài đặt bảo mật đã được cập nhật');
    } catch (_error) {
      toast.error('Có lỗi xảy ra khi cập nhật cài đặt bảo mật');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className='space-y-6'>
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className='h-6 w-32' />
              <Skeleton className='h-4 w-48' />
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className='flex items-center justify-between'>
                    <Skeleton className='h-4 w-24' />
                    <Skeleton className='h-6 w-12' />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
        {/* Password Policy */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Lock className='h-5 w-5' />
              Chính sách mật khẩu
            </CardTitle>
            <CardDescription>Cấu hình các yêu cầu bảo mật cho mật khẩu người dùng</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <FormField
              control={form.control}
              name='passwordPolicy.minLength'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Độ dài tối thiểu</FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      min={6}
                      max={128}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>Số ký tự tối thiểu cho mật khẩu (6-128)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='passwordPolicy.requireUppercase'
                render={({ field }) => (
                  <FormItem className='flex flex-row items-center justify-between rounded-lg border p-3'>
                    <div className='space-y-0.5'>
                      <FormLabel>Chữ hoa</FormLabel>
                      <FormDescription className='text-xs'>
                        Yêu cầu ít nhất 1 chữ hoa
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
                name='passwordPolicy.requireLowercase'
                render={({ field }) => (
                  <FormItem className='flex flex-row items-center justify-between rounded-lg border p-3'>
                    <div className='space-y-0.5'>
                      <FormLabel>Chữ thường</FormLabel>
                      <FormDescription className='text-xs'>
                        Yêu cầu ít nhất 1 chữ thường
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
                name='passwordPolicy.requireNumbers'
                render={({ field }) => (
                  <FormItem className='flex flex-row items-center justify-between rounded-lg border p-3'>
                    <div className='space-y-0.5'>
                      <FormLabel>Số</FormLabel>
                      <FormDescription className='text-xs'>Yêu cầu ít nhất 1 số</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='passwordPolicy.requireSpecialChars'
                render={({ field }) => (
                  <FormItem className='flex flex-row items-center justify-between rounded-lg border p-3'>
                    <div className='space-y-0.5'>
                      <FormLabel>Ký tự đặc biệt</FormLabel>
                      <FormDescription className='text-xs'>
                        Yêu cầu ít nhất 1 ký tự đặc biệt
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name='passwordPolicy.expirationDays'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Thời hạn mật khẩu (ngày)</FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      min={0}
                      max={365}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    Số ngày sau khi mật khẩu hết hạn (0 = không hết hạn)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Session Settings */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Clock className='h-5 w-5' />
              Cài đặt phiên làm việc
            </CardTitle>
            <CardDescription>
              Quản lý thời gian và số lượng phiên đăng nhập của người dùng
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='sessionSettings.maxSessionDuration'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Thời gian phiên tối đa (phút)</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        min={1}
                        max={2880}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>Thời gian tối đa một phiên có thể hoạt động</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='sessionSettings.inactivityTimeout'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Timeout không hoạt động (phút)</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        min={5}
                        max={480}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      Thời gian timeout khi người dùng không hoạt động
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name='sessionSettings.maxConcurrentSessions'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Số phiên đồng thời tối đa</FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      min={1}
                      max={10}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    Số phiên đăng nhập đồng thời tối đa cho một người dùng
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Two Factor Authentication */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Shield className='h-5 w-5' />
              Xác thực hai yếu tố (2FA)
            </CardTitle>
            <CardDescription>Cấu hình xác thực hai yếu tố để tăng cường bảo mật</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <FormField
              control={form.control}
              name='twoFactorAuth.enabled'
              render={({ field }) => (
                <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                  <div className='space-y-0.5'>
                    <FormLabel className='text-base'>Bật xác thực hai yếu tố</FormLabel>
                    <FormDescription>
                      Cho phép người dùng sử dụng xác thực hai yếu tố
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
              name='twoFactorAuth.required'
              render={({ field }) => (
                <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                  <div className='space-y-0.5'>
                    <FormLabel className='text-base'>Bắt buộc xác thực hai yếu tố</FormLabel>
                    <FormDescription>Yêu cầu tất cả người dùng phải sử dụng 2FA</FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={!form.watch('twoFactorAuth.enabled')}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='twoFactorAuth.backupCodes'
              render={({ field }) => (
                <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                  <div className='space-y-0.5'>
                    <FormLabel className='text-base'>Mã sao lưu</FormLabel>
                    <FormDescription>Cho phép tạo mã sao lưu để khôi phục 2FA</FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={!form.watch('twoFactorAuth.enabled')}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className='flex justify-end'>
          <Button type='submit' disabled={isSubmitting}>
            {isSubmitting && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
            Lưu cài đặt bảo mật
          </Button>
        </div>
      </form>
    </Form>
  );
}
