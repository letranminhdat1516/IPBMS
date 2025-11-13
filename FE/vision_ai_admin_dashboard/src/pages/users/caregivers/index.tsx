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

import { useAuthStore } from '@/stores/authStore';

import { CaregiverListSchema } from '@/types/user';

import { useCaregivers } from '@/services/caregivers';

import { CaregiverDialogs } from './components/caregiver-dialogs';
import { CaregiverPrimaryButtons } from './components/caregiver-primary-buttons';
import { caregiversColumns } from './components/caregivers-columns';
import { CaregiversTable } from './components/caregivers-table';
import { CaregiverProvider } from './context/caregiver-context';

export default function CaregiversPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>(
    'all'
  );
  // Load caregivers from API
  const { data, isLoading, isError } = useCaregivers({
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
    status: statusFilter === 'all' ? undefined : statusFilter,
  });
  const caregiverList = useMemo(() => (data ? CaregiverListSchema.parse(data.items) : []), [data]);
  const filtered = caregiverList;
  const user = useAuthStore((state) => state.auth.user);
  const isAdmin = user?.role?.includes('admin');

  return (
    <CaregiverProvider>
      <Header fixed>
        <Search />
        <div className='ml-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='bg-card text-card-foreground mb-4 rounded-xl border p-6 shadow-sm'>
          <div className='flex flex-wrap items-center justify-between gap-4'>
            <div>
              <h2 className='mb-1 text-2xl font-bold tracking-tight'>Quản lý người chăm sóc</h2>
              <div className='mb-2 flex flex-wrap items-center gap-4'>
                <div className='text-primary bg-muted rounded px-3 py-1 text-sm font-semibold'>
                  Tổng số: {isLoading ? '...' : caregiverList.length}
                </div>
                <div className='flex gap-2 text-xs'>
                  <span className='rounded bg-yellow-500/10 px-2 py-0.5 font-medium text-yellow-600 dark:text-yellow-400'>
                    Đang chờ:{' '}
                    {isLoading ? '...' : caregiverList.filter((c) => c.status === 'pending').length}
                  </span>
                  <span className='rounded bg-green-500/10 px-2 py-0.5 font-medium text-green-600 dark:text-green-400'>
                    Đã duyệt:{' '}
                    {isLoading
                      ? '...'
                      : caregiverList.filter((c) => c.status === 'approved').length}
                  </span>
                  <span className='rounded bg-red-500/10 px-2 py-0.5 font-medium text-red-600 dark:text-red-400'>
                    Từ chối:{' '}
                    {isLoading
                      ? '...'
                      : caregiverList.filter((c) => c.status === 'rejected').length}
                  </span>
                </div>
              </div>
            </div>
            <div className='flex gap-2'>
              <Select
                value={statusFilter}
                onValueChange={(v) =>
                  setStatusFilter(v as 'all' | 'pending' | 'approved' | 'rejected')
                }
              >
                <SelectTrigger className='h-8 w-40 text-xs'>
                  <SelectValue placeholder='Trạng thái' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>Tất cả</SelectItem>
                  <SelectItem value='pending'>Pending</SelectItem>
                  <SelectItem value='approved'>Approved</SelectItem>
                  <SelectItem value='rejected'>Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Button variant='outline' className='space-x-1 px-3 py-1 text-xs font-semibold'>
                Duyệt đăng ký
              </Button>
              <CaregiverPrimaryButtons />
            </div>
          </div>
        </div>

        <div className='-mx-4 flex-1 overflow-auto px-4 py-1'>
          <div className='bg-card text-card-foreground rounded-xl border p-2 shadow-sm'>
            {isError ? (
              <div className='text-muted-foreground p-6 text-center text-sm'>
                Không tải được danh sách.
              </div>
            ) : isLoading ? (
              <div className='text-muted-foreground p-6 text-center text-sm'>Đang tải dữ liệu…</div>
            ) : (
              <CaregiversTable
                data={filtered}
                columns={caregiversColumns}
                isAdmin={Boolean(isAdmin)}
                onRowClick={(row) =>
                  navigate({
                    to: '/users/caregiver/detail/$caregiverId',
                    params: { caregiverId: String(row.user_id) },
                  })
                }
              />
            )}
          </div>
        </div>
      </Main>
      <CaregiverDialogs />
    </CaregiverProvider>
  );
}
