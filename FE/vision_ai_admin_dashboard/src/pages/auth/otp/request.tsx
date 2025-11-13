import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useState } from 'react';

import { Link, useNavigate } from '@tanstack/react-router';

import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

import AuthLayout from '@/pages/auth/auth-layout';

import { requestOtp, resetOtp } from '@/services/auth';

const schema = z.object({
  phone: z.string().min(6, 'Vui lòng nhập số điện thoại'),
});

export default function OtpRequestPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { phone: '' },
  });

  const onSubmit = async (values: z.infer<typeof schema>) => {
    setIsLoading(true);
    try {
      await requestOtp({ phone_number: values.phone, method: 'sms' });
      navigate({ to: '/otp', search: { phone: values.phone } });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Không thể gửi OTP';
      form.setError('phone', { type: 'manual', message: msg });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    const phone = form.getValues('phone');
    if (!phone) return;
    try {
      await resetOtp({ phone_number: phone });
    } catch {
      // ignore UI error for reset
    }
  };

  return (
    <AuthLayout>
      <Card className='gap-4'>
        <CardHeader>
          <CardTitle className='text-lg tracking-tight'>Khách hàng: Đăng nhập bằng OTP</CardTitle>
          <CardDescription>Nhập số điện thoại để nhận mã OTP qua SMS.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='grid gap-3'>
              <FormField
                control={form.control}
                name='phone'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Số điện thoại</FormLabel>
                    <FormControl>
                      <Input placeholder='VD: 0912 345 678' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className='flex gap-2'>
                <Button type='submit' disabled={isLoading}>
                  Gửi OTP
                </Button>
                <Button type='button' variant='outline' disabled={isLoading} onClick={handleReset}>
                  Gửi lại OTP
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
        <CardFooter>
          <p className='text-muted-foreground px-8 text-center text-sm'>
            Hoặc{' '}
            <Link to='/sign-in' className='hover:text-primary underline underline-offset-4'>
              đăng nhập bằng email/password
            </Link>
          </p>
        </CardFooter>
      </Card>
    </AuthLayout>
  );
}
