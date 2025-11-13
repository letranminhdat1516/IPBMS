import { DEFAULT_PAGE_SIZE } from '@/constants';

import { useMemo, useState } from 'react';

import { useNavigate } from '@tanstack/react-router';

import { Header } from '@/components/layout/header';
import { Main } from '@/components/layout/main';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { ProfileDropdown } from '@/components/profile-dropdown';
import { Search } from '@/components/search';
import { ThemeSwitch } from '@/components/theme-switch';

import { useSubscriptionsWithUsers } from '@/hooks/use-subscriptions';

import type { Subscription } from '@/types/subscription';

import { AdminSubscriptionList } from './components/admin-subscription-list';
import { columns } from './components/subscriptions-columns';
import { SubscriptionsDialogs } from './components/subscriptions-dialogs';
import { SubscriptionsPrimaryButtons } from './components/subscriptions-primary-buttons';
import { SubscriptionsTable } from './components/subscriptions-table';
import SubscriptionsProvider from './context/subscriptions-context';

export default function Subscriptions() {
  const navigate = useNavigate();
  const isAdmin = true;
  const { data, isLoading } = useSubscriptionsWithUsers({ page: 1, limit: DEFAULT_PAGE_SIZE });

  const subscriptionList = useMemo(() => {
    return data?.subscriptions ?? [];
  }, [data]);

  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'inactive' | 'cancelled' | 'expired'
  >('all');

  // Toggle between basic and advanced view
  const [useAdvancedView, setUseAdvancedView] = useState(false);

  const counts = useMemo(() => {
    const init = {
      total: subscriptionList.length,
      active: 0,
      inactive: 0,
      cancelled: 0,
      expired: 0,
    };
    return subscriptionList.reduce((acc, s) => {
      if (s.status === 'active') acc.active++;
      else if (s.status === 'inactive') acc.inactive++;
      else if (s.status === 'cancelled') acc.cancelled++;
      else if (s.status === 'expired') acc.expired++;
      return acc;
    }, init);
  }, [subscriptionList]);

  const tableData = useMemo(() => {
    if (statusFilter === 'all') return subscriptionList;
    return subscriptionList.filter((s) => s.status === statusFilter);
  }, [statusFilter, subscriptionList]);

  return (
    <SubscriptionsProvider>
      <Header fixed>
        <Search />
        <div className='ml-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='bg-card text-card-foreground mb-6 rounded-xl border p-6 shadow-sm'>
          <div className='flex flex-wrap items-center justify-between gap-4'>
            <div>
              <h2 className='mb-1 text-2xl font-bold tracking-tight'>Quản lý gói đăng ký</h2>
              <p className='text-muted-foreground mb-2 text-sm'>
                Theo dõi gói đăng ký và thanh toán của khách hàng
              </p>
              <div className='mb-2 flex flex-wrap items-center gap-4'>
                <div className='text-primary bg-muted rounded px-3 py-1 text-sm font-semibold'>
                  Tổng số: {isLoading ? '...' : counts.total}
                </div>
                <div className='flex gap-2 text-xs'>
                  <span className='rounded bg-green-500/10 px-2 py-0.5 font-medium text-green-600 dark:text-green-400'>
                    Hoạt động: {isLoading ? '...' : counts.active}
                  </span>
                  <span className='bg-muted text-muted-foreground rounded px-2 py-0.5 font-medium'>
                    Không hoạt động: {isLoading ? '...' : counts.inactive}
                  </span>
                  <span className='bg-muted text-muted-foreground rounded px-2 py-0.5 font-medium'>
                    Đã hủy: {isLoading ? '...' : counts.cancelled}
                  </span>
                  <span className='bg-muted text-muted-foreground rounded px-2 py-0.5 font-medium'>
                    Đã hết hạn: {isLoading ? '...' : counts.expired}
                  </span>
                </div>
              </div>
              <div className='mt-2 flex items-center gap-2'>
                <span className='text-muted-foreground text-xs font-medium'>Trạng thái:</span>
                <Select
                  value={statusFilter}
                  onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
                >
                  <SelectTrigger className='h-8 w-32 text-xs'>
                    <SelectValue placeholder='Lọc trạng thái' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>Tất cả</SelectItem>
                    <SelectItem value='active'>Hoạt động</SelectItem>
                    <SelectItem value='inactive'>Không hoạt động</SelectItem>
                    <SelectItem value='cancelled'>Đã hủy</SelectItem>
                    <SelectItem value='expired'>Đã hết hạn</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className='flex gap-2'>
              <Button
                variant={useAdvancedView ? 'outline' : 'default'}
                size='sm'
                onClick={() => setUseAdvancedView(false)}
              >
                View Cơ bản
              </Button>
              <Button
                variant={useAdvancedView ? 'default' : 'outline'}
                size='sm'
                onClick={() => setUseAdvancedView(true)}
              >
                View Nâng cao
              </Button>
              <SubscriptionsPrimaryButtons />
            </div>
          </div>
        </div>

        <div className='-mx-4 flex-1 overflow-auto px-4 py-1 lg:flex-row lg:space-y-0 lg:space-x-12'>
          {useAdvancedView ? (
            <AdminSubscriptionList />
          ) : (
            <div className='bg-card text-card-foreground rounded-xl border p-2 shadow-sm'>
              {isLoading ? (
                <div className='text-muted-foreground p-6 text-center text-sm'>
                  Đang tải danh sách gói đăng ký…
                </div>
              ) : (
                <SubscriptionsTable
                  data={tableData}
                  columns={columns}
                  onRowClick={(subscription: Subscription) => {
                    // Navigate to subscription detail page
                    navigate({ to: `/subscriptions/${subscription.subscription_id}` });
                  }}
                  isAdmin={isAdmin}
                />
              )}
            </div>
          )}
        </div>
      </Main>
      <SubscriptionsDialogs />
    </SubscriptionsProvider>
  );
}
