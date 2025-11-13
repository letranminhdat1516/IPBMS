import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import AuthLayout from '../auth-layout';
import { UserAuthForm } from './components/user-auth-form';

export default function SignIn() {
  return (
    <AuthLayout>
      <Card className='gap-4'>
        <CardHeader>
          <CardTitle className='text-lg tracking-tight'>Đăng nhập</CardTitle>
          <CardDescription>
            Nhập email và mật khẩu của bạn bên dưới để <br />
            đăng nhập vào tài khoản
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserAuthForm />
        </CardContent>
        <CardFooter>
          <p className='text-muted-foreground px-8 text-center text-sm'>
            Bằng cách nhấp vào đăng nhập, bạn đồng ý với{' '}
            <a href='/terms' className='hover:text-primary underline underline-offset-4'>
              Điều khoản Dịch vụ
            </a>{' '}
            và{' '}
            <a href='/privacy' className='hover:text-primary underline underline-offset-4'>
              Chính sách Bảo mật
            </a>
            .
          </p>
        </CardFooter>
      </Card>
    </AuthLayout>
  );
}
