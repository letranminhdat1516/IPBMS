import { DEFAULT_PAGE_SIZE } from '@/constants';

import { useEffect, useMemo, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { Header } from '@/components/layout/header';
import { Main } from '@/components/layout/main';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { ProfileDropdown } from '@/components/profile-dropdown';
import { Search } from '@/components/search';
import { ThemeSwitch } from '@/components/theme-switch';

import { Notification } from '@/types/notification';

import { formatDateTimeVN } from '@/utils/date';

import { useNotifications } from '@/services/notifications';

import { NotificationsPagination } from './components/notifications-pagination';
import SendNotificationDialog from './components/send-notification-dialog';

export default function NotificationsPage() {
  const qc = useQueryClient();
  // filters
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);
  const [status, setStatus] = useState<string>('');
  const [recipient, setRecipient] = useState<string>('');
  const [searchText, setSearchText] = useState('');

  const { data, isLoading, isError, refetch, isFetching } = useNotifications({
    page,
    limit,
    status: status || undefined,
    recipient: recipient || undefined,
  });

  const items: Notification[] = useMemo(() => data?.data ?? [], [data]);
  const total = data?.total ?? 0;

  // simple search client-side on message
  const filtered = useMemo(
    () =>
      items.filter((n) => {
        const messageStr =
          typeof n.message === 'string'
            ? n.message
            : typeof n.message === 'object'
              ? JSON.stringify(n.message)
              : String(n.message);
        return searchText.trim()
          ? messageStr.toLowerCase().includes(searchText.toLowerCase())
          : true;
      }),
    [items, searchText]
  );

  useEffect(() => {
    // refetch when filters change page except client-only search
    refetch();
  }, [page, status, recipient, limit, refetch]);

  return (
    <>
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
              <h2 className='mb-1 text-2xl font-bold tracking-tight'>Thông báo</h2>
              <div className='text-muted-foreground text-sm'>
                Quản lý và gửi thông báo đến người dùng.
              </div>
            </div>
            <div className='flex items-center gap-2'>
              <SendNotificationDialog
                onSent={async () => {
                  await qc.invalidateQueries({ queryKey: ['notifications'] });
                }}
              />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className='mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3'>
          <div className='flex flex-col gap-1'>
            <Label className='text-xs'>Trạng thái</Label>
            <Select
              value={status}
              onValueChange={(v) => {
                setPage(1);
                setStatus(v === 'all' ? '' : v);
              }}
            >
              <SelectTrigger className='h-8'>
                <SelectValue placeholder='Tất cả' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>Tất cả</SelectItem>
                <SelectItem value='sent'>Đã gửi</SelectItem>
                <SelectItem value='failed'>Lỗi</SelectItem>
                <SelectItem value='pending'>Chờ gửi</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className='flex flex-col gap-1'>
            <Label className='text-xs'>Người nhận (ID)</Label>
            <Input
              placeholder='VD: 123'
              value={recipient}
              onChange={(e) => {
                setPage(1);
                setRecipient(e.target.value);
              }}
              className='h-8'
            />
          </div>
          <div className='flex flex-col gap-1'>
            <Label className='text-xs'>Tìm kiếm nội dung</Label>
            <Input
              placeholder='Nội dung thông báo...'
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className='h-8'
            />
          </div>
        </div>

        <div className='bg-card text-card-foreground overflow-x-auto rounded-xl border'>
          {isError ? (
            <div className='text-muted-foreground p-6 text-center text-sm'>
              Không tải được danh sách.
            </div>
          ) : isLoading || isFetching ? (
            <div className='text-muted-foreground p-6 text-center text-sm'>Đang tải dữ liệu…</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Người nhận</TableHead>
                  <TableHead>Nội dung</TableHead>
                  <TableHead>Thời gian</TableHead>
                  <TableHead className='text-right'>Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className='text-muted-foreground py-8 text-center'>
                      Chưa có thông báo.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((n) => (
                    <TableRow key={n.notification_id}>
                      <TableCell className='font-mono text-xs'>#{n.notification_id}</TableCell>
                      <TableCell>{n.business_type ?? 'N/A'}</TableCell>
                      <TableCell>{n.user_id}</TableCell>
                      <TableCell className='max-w-xl truncate'>{n.message}</TableCell>
                      <TableCell>{formatDateTimeVN(n.sent_at || n.created_at)}</TableCell>
                      <TableCell className='text-right'>
                        <span className='bg-muted rounded px-2 py-1 text-xs'>{n.status}</span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>

        <NotificationsPagination
          page={page}
          pageSize={limit}
          total={total}
          onPageChange={(p) => setPage(p)}
          onPageSizeChange={(size) => {
            setPage(1);
            setLimit(size);
          }}
        />
      </Main>
    </>
  );
}
