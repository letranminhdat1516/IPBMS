import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { HTMLAttributes, useState } from 'react';

import { useRouter, useSearch } from '@tanstack/react-router';

import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '@/components/ui/input-otp';

import { useAuth } from '@/hooks/use-auth';

import { cn } from '@/lib/utils';

import { login } from '@/services/auth';

type OtpFormProps = HTMLAttributes<HTMLFormElement>;

const formSchema = z.object({
  otp: z.string().min(6, 'Please enter your otp code.'),
});

export function OtpForm({ className, ...props }: OtpFormProps) {
  const router = useRouter();
  const search = useSearch({ from: '/(auth)/otp' }) as { phone?: string };
  const { setAccessToken, setUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { otp: '' },
  });

  const otp = form.watch('otp');

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      if (!search?.phone) throw new Error('Thiếu số điện thoại');
      const res = await login({ phone_number: search.phone, otp_code: data.otp });
      setAccessToken(res.access_token);
      setUser({
        user_id: res.user.user_id || res.user.username || '—',
        username: res.user.username || '',
        email: res.user.email,
        role: res.user.role,
        status: 'active',
        phone: res.user.phone_number ?? '',
        full_name: res.user.full_name ?? res.user.username ?? '',
        created_at: res.user.created_at || undefined,
      });
      await router.navigate({ to: '/' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Xác thực OTP thất bại';
      // surface error on field
      form.setError('otp', { type: 'manual', message: msg });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('grid gap-2', className)}
        {...props}
      >
        <FormField
          control={form.control}
          name='otp'
          render={({ field }) => (
            <FormItem>
              <FormLabel className='sr-only'>One-Time Password</FormLabel>
              <FormControl>
                <InputOTP
                  maxLength={6}
                  {...field}
                  containerClassName='justify-between sm:[&>[data-slot="input-otp-group"]>div]:w-12'
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button className='mt-2' disabled={otp.length < 6 || isLoading}>
          Verify
        </Button>
      </form>
    </Form>
  );
}
