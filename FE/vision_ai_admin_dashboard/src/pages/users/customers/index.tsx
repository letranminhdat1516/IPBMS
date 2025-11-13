import { DEFAULT_PAGE_SIZE } from '@/constants';

import { useMemo, useState } from 'react';

import { useNavigate } from '@tanstack/react-router';

import { Header } from '@/components/layout/header';
import { Main } from '@/components/layout/main';

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

import type { User } from '@/types/user';

import { useUsers } from '@/services/users';

import { columns } from './components/users-columns';
import { UsersDialogs } from './components/users-dialogs';
import { UsersPrimaryButtons } from './components/users-primary-buttons';
import { UsersTable } from './components/users-table';
import UsersProvider from './context/users-context';

export default function Users() {
  const isAdmin = true;
  const { data, isLoading } = useUsers({ page: 1, limit: DEFAULT_PAGE_SIZE });

  const userList = useMemo(() => {
    const allUsers = data?.users ?? [];
    // Filter chỉ lấy customers ở client side
    return allUsers.filter((user: User) => user.role === 'customer' || user.type === 'customer');
  }, [data]);

  // Nếu cần filter theo status, có thể dùng:
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const counts = useMemo(() => {
    const init = { total: userList.length, active: 0, inactive: 0 };
    return userList.reduce((acc, u) => {
      if (u.is_active) acc.active++;
      else acc.inactive++;
      return acc;
    }, init);
  }, [userList]);
  const tableData = useMemo(() => {
    if (statusFilter === 'all') return userList;
    return userList.filter((u) => {
      if (statusFilter === 'active') return u.is_active;
      if (statusFilter === 'inactive') return !u.is_active;
      return true;
    });
  }, [statusFilter, userList]);
  const navigate = useNavigate();
  return (
    <UsersProvider>
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
              <h2 className='mb-1 text-2xl font-bold tracking-tight'>Quản lý khách hàng</h2>
              <p className='text-muted-foreground mb-2 text-sm'>
                Quản lý và theo dõi thông tin khách hàng của hệ thống
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
                </div>
              </div>
              <div className='mt-2 flex items-center gap-2'>
                <span className='text-muted-foreground text-xs font-medium'>Trạng thái:</span>
                <Select
                  value={statusFilter}
                  onValueChange={(v) => setStatusFilter(v as 'all' | 'active' | 'inactive')}
                >
                  <SelectTrigger className='h-8 w-32 text-xs'>
                    <SelectValue placeholder='Lọc trạng thái' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>Tất cả</SelectItem>
                    <SelectItem value='active'>Hoạt động</SelectItem>
                    <SelectItem value='inactive'>Không hoạt động</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className='flex gap-2'>
              <UsersPrimaryButtons />
            </div>
          </div>
        </div>
        {/* Hiển thị bảng người dùng với filter */}
        <div className='-mx-4 flex-1 overflow-auto px-4 py-1 lg:flex-row lg:space-y-0 lg:space-x-12'>
          <div className='bg-card text-card-foreground rounded-xl border p-2 shadow-sm'>
            {isLoading ? (
              <div className='text-muted-foreground p-6 text-center text-sm'>
                Đang tải danh sách khách hàng…
              </div>
            ) : (
              <UsersTable
                data={tableData}
                columns={columns}
                onRowClick={(user) =>
                  navigate({
                    to: '/users/customer/detail/$userId',
                    params: { userId: String(user.user_id) },
                  })
                }
                isAdmin={isAdmin}
              />
            )}
          </div>
        </div>
      </Main>
      <UsersDialogs />
    </UsersProvider>
  );
}
