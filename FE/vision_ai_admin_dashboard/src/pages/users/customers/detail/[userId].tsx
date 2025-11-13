import { Bell, Settings, User2 } from 'lucide-react';

import { useParams, useRouter } from '@tanstack/react-router';

import { Header } from '@/components/layout/header';
import { Main } from '@/components/layout/main';

import { Button } from '@/components/ui/button';

import { useUser } from '@/services/userDetail';

import { BackButton } from './components/BackButton';
import NotFoundUser from './components/NotFoundUser';
import { UserInfoCard } from './components/UserInfoCard';
import { UserTabs } from './components/UserTabs';

export default function UserDetail() {
  const router = useRouter();
  const { userId } = useParams({ from: '/_authenticated/users/customer/detail/$userId' });
  // Load single user via API
  const { data: user, isLoading, isError } = useUser(userId);

  if (isLoading) {
    return (
      <Main className='flex h-full w-full items-center justify-center'>
        <div className='text-muted-foreground'>Đang tải thông tin người dùng…</div>
      </Main>
    );
  }

  if (isError || !user) {
    return (
      <Main className='flex h-full w-full items-center justify-center'>
        <NotFoundUser />
      </Main>
    );
  }

  return (
    <>
      <Header fixed />
      <Main>
        <div className='mx-auto max-w-6xl'>
          {/* Title & Actions */}
          <div className='mb-6 flex items-center justify-between'>
            <div>
              <div className='flex items-center gap-2 text-2xl font-bold'>
                <User2 className='h-7 w-7' />
                Chi tiết khách hàng
              </div>
              <div className='text-muted-foreground text-sm'>Quản lý tài khoản khách hàng</div>
            </div>
            <div className='flex gap-2'>
              <Button variant='outline' size='sm' onClick={() => router.navigate({ to: '/plan' })}>
                <Settings className='mr-1 h-4 w-4' />
                Quản lý gói
              </Button>
              <Button
                variant='default'
                size='sm'
                onClick={() => router.navigate({ to: '/notifications' })}
              >
                <Bell className='mr-1 h-4 w-4' />
                Cấu hình thông báo
              </Button>
            </div>
          </div>
          {/* Card Info */}
          <UserInfoCard user={user} />
          {/* Tabs (mockup) */}
          <UserTabs />
          {/* Back button */}
          <BackButton onClick={() => router.navigate({ to: '/users/customer' })} />
        </div>
      </Main>
    </>
  );
}
