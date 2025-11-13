import { useEffect, useState } from 'react';

import { Link, createFileRoute, useNavigate, useRouter } from '@tanstack/react-router';

import { SignedIn, UserButton, useAuth } from '@clerk/clerk-react';

import { IconArrowUpRight, IconLoader2 } from '@tabler/icons-react';

import { ClerkLogo } from '@/assets/clerk-logo';

import { Header } from '@/components/layout/header';
import { Main } from '@/components/layout/main';

import { Button } from '@/components/ui/button';

import { LearnMore } from '@/components/learn-more';
import { Search } from '@/components/search';
import { ThemeSwitch } from '@/components/theme-switch';

import { columns } from '@/pages/users/customers/components/users-columns';
import { UsersDialogs } from '@/pages/users/customers/components/users-dialogs';
import { UsersPrimaryButtons } from '@/pages/users/customers/components/users-primary-buttons';
import { UsersTable } from '@/pages/users/customers/components/users-table';
import UsersProvider from '@/pages/users/customers/context/users-context';
import { useCustomerList } from '@/pages/users/customers/data/data';
import { userListSchema } from '@/pages/users/customers/data/schema';

export const Route = createFileRoute('/clerk/_authenticated/user-management')({
  component: UserManagement,
});

function UserManagement() {
  const [opened, setOpened] = useState(true);
  const { isLoaded, isSignedIn } = useAuth();

  // Use API data instead of static data
  const { data: usersData, isLoading: _isLoading } = useCustomerList();
  const userList = usersData ? userListSchema.parse(usersData.users) : [];

  if (!isLoaded) {
    return (
      <div className='flex h-svh items-center justify-center'>
        <IconLoader2 className='size-8 animate-spin' />
      </div>
    );
  }

  if (!isSignedIn) {
    return <Unauthorized />;
  }
  return (
    <>
      <SignedIn>
        <UsersProvider>
          <Header fixed>
            <Search />
            <div className='ml-auto flex items-center space-x-4'>
              <ThemeSwitch />
              <UserButton />
            </div>
          </Header>

          <Main>
            <div className='mb-2 flex flex-wrap items-center justify-between space-y-2'>
              <div>
                <h2 className='text-2xl font-bold tracking-tight'>Danh sách người dùng</h2>
                <div className='flex gap-1'>
                  <p className='text-muted-foreground'>Quản lý người dùng và vai trò tại đây.</p>
                  <LearnMore
                    open={opened}
                    onOpenChange={setOpened}
                    contentProps={{ side: 'right' }}
                  >
                    <p>
                      Trang này tương tự với{' '}
                      <Link
                        to='/users/customer'
                        className='text-blue-500 underline decoration-dashed underline-offset-2'
                      >
                        &apos;/users&apos;
                      </Link>
                    </p>

                    <p className='mt-4'>
                      Bạn có thể đăng xuất hoặc quản lý/xóa tài khoản thông qua menu Hồ sơ người
                      dùng ở góc trên bên phải trang.
                      <IconArrowUpRight className='inline-block size-4' />
                    </p>
                  </LearnMore>
                </div>
              </div>
              <UsersPrimaryButtons />
            </div>
            <div className='-mx-4 flex-1 overflow-auto px-4 py-1 lg:flex-row lg:space-y-0 lg:space-x-12'>
              <UsersTable data={userList} columns={columns} />
            </div>
          </Main>

          <UsersDialogs />
        </UsersProvider>
      </SignedIn>
    </>
  );
}

const COUNTDOWN = 5; // Countdown second

function Unauthorized() {
  const navigate = useNavigate();
  const { history } = useRouter();

  const [opened, setOpened] = useState(true);
  const [cancelled, setCancelled] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN);

  // Set and run the countdown conditionally
  useEffect(() => {
    if (cancelled || opened) return;
    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cancelled, opened]);

  // Navigate to sign-in page when countdown hits 0
  useEffect(() => {
    if (countdown > 0) return;
    navigate({ to: '/clerk/sign-in' });
  }, [countdown, navigate]);

  return (
    <div className='h-svh'>
      <div className='m-auto flex h-full w-full flex-col items-center justify-center gap-2'>
        <h1 className='text-[7rem] leading-tight font-bold'>401</h1>
        <span className='font-medium'>Không có quyền truy cập</span>
        <p className='text-muted-foreground text-center'>
          Bạn cần đăng nhập thông qua Clerk{' '}
          <sup>
            <LearnMore open={opened} onOpenChange={setOpened}>
              <p>
                Trang này tương tự với{' '}
                <Link
                  to='/users/customer'
                  className='text-blue-500 underline decoration-dashed underline-offset-2'
                >
                  &apos;/users&apos;
                </Link>
                .{' '}
              </p>
              <p>Bạn cần đăng nhập bằng Clerk trước khi truy cập tuyến này. </p>

              <p className='mt-4'>
                Sau khi đăng nhập, bạn có thể đăng xuất hoặc xóa tài khoản trong menu Hồ sơ người
                dùng trên trang này.
              </p>
            </LearnMore>
          </sup>
          <br />
          để truy cập nội dung này.
        </p>
        <div className='mt-6 flex gap-4'>
          <Button variant='outline' onClick={() => history.go(-1)}>
            Quay lại
          </Button>
          <Button onClick={() => navigate({ to: '/clerk/sign-in' })}>
            <ClerkLogo className='invert' /> Đăng nhập
          </Button>
        </div>
        <div className='mt-4 h-8 text-center'>
          {!cancelled && !opened && (
            <>
              <p>
                {countdown > 0
                  ? `Sẽ chuyển sang trang Đăng nhập sau ${countdown}s`
                  : `Đang chuyển hướng...`}
              </p>
              <Button variant='link' onClick={() => setCancelled(true)}>
                Hủy chuyển hướng
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
