import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { HTMLAttributes, useState } from 'react';

import { Link, useRouter } from '@tanstack/react-router';

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
import { Input } from '@/components/ui/input';

import { PasswordInput } from '@/components/password-input';

import { useAuth } from '@/hooks/use-auth';

import api from '@/lib/api';
import { cn } from '@/lib/utils';

type UserAuthFormProps = HTMLAttributes<HTMLFormElement>;

const formSchema = z.object({
  email: z.email({
    error: (iss) => (iss.input === '' ? 'Vui lòng nhập email của bạn' : undefined),
  }),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu').min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
});

export function UserAuthForm({ className, ...props }: UserAuthFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { setUser, setAccessToken } = useAuth();

  // Demo account
  const DEMO_EMAIL = 'admin@healthcare.com';
  const DEMO_PASSWORD = '123456';

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    },
  });

  // function getJwtExp(token: string): number | null {
  //   try {
  //     const payload = token.split('.')[1];
  //     if (!payload) return null;
  //     const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
  //     const json = atob(base64);
  //     const obj = JSON.parse(json);
  //     return typeof obj.exp === 'number' ? obj.exp : null;
  //   } catch {
  //     return null;
  //   }
  // }

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      const { email, password } = data;
      type LoginResponse = {
        access_token: string;
        user: {
          user_id: string;
          username?: string;
          full_name?: string;
          email: string;
          role: string;
          phone_number?: string;
          is_first_login?: boolean;
          created_at?: string;
        };
      };
      const res = await api.post<LoginResponse>('/auth/admin/login', { email, password });

      // Persist token
      setAccessToken(res.access_token);

      // Map backend user to store shape
      // const exp = getJwtExp(res.access_token) ?? Math.floor(Date.now() / 1000) + 60 * 60;
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

      // Redirect to intended page or dashboard
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get('redirect') || '';
      if (redirect && !redirect.includes('/sign-in')) {
        if (/^https?:\/\//i.test(redirect)) {
          window.location.href = redirect; // external or absolute URL
        } else {
          router.history.push(redirect); // SPA navigate to captured path
        }
        return;
      }

      await router.navigate({ to: '/' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Login failed';
      // Surface error on form fields
      form.setError('password', {
        type: 'manual',
        message: /401|403/.test(msg) ? 'Email hoặc mật khẩu không hợp lệ' : 'Không thể đăng nhập',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('grid gap-3', className)}
        {...props}
      >
        <FormField
          control={form.control}
          name='email'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder={DEMO_EMAIL} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='password'
          render={({ field }) => (
            <FormItem className='relative'>
              <FormLabel>Mật khẩu</FormLabel>
              <FormControl>
                <PasswordInput placeholder={DEMO_PASSWORD} {...field} />
              </FormControl>
              <FormMessage />
              <Link
                to='/forgot-password'
                className='text-muted-foreground absolute -top-0.5 right-0 text-sm font-medium hover:opacity-75'
              >
                Quên mật khẩu?
              </Link>
            </FormItem>
          )}
        />
        <Button className='mt-2' disabled={isLoading}>
          Đăng nhập
        </Button>

        {/* <div className='relative my-2'>
          <div className='absolute inset-0 flex items-center'>
            <span className='w-full border-t' />
          </div>
          <div className='relative flex justify-center text-xs uppercase'>
            <span className='bg-background text-muted-foreground px-2'>Hoặc tiếp tục với</span>
          </div>
        </div> */}

        {/* <div className='grid grid-cols-2 gap-2'>
          <Button variant='outline' type='button' disabled={isLoading}>
            <IconBrandGithub className='h-4 w-4' /> GitHub
          </Button>
          <Button variant='outline' type='button' disabled={isLoading}>
            <IconBrandFacebook className='h-4 w-4' /> Facebook
          </Button>
        </div> */}

        {/* <p className='text-muted-foreground mt-3 text-xs'>Đăng nhập quản trị qua API</p> */}
        {/* <p className='text-muted-foreground mt-1 text-xs'>
          Khách hàng:{' '}
          <Link to='/request-otp' className='hover:text-primary underline underline-offset-4'>
            đăng nhập bằng số điện thoại/OTP
          </Link>
        </p> */}
      </form>
    </Form>
  );
}
