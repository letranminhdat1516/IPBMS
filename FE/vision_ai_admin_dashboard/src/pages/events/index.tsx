import { useState } from 'react';

import { Header } from '@/components/layout/header';
import { Main } from '@/components/layout/main';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { ProfileDropdown } from '@/components/profile-dropdown';
import { Search } from '@/components/search';
import { ThemeSwitch } from '@/components/theme-switch';

import { EventFilters } from './components/EventFilters';
import { EventList } from './components/EventList';
import { EventSummaryCards } from './components/EventSummaryCards';
import { DEFAULT_PAGE_SIZE } from './constants';
import { useEvents } from './hooks/useEvents';

export default function EventsPage() {
  const [page, setPage] = useState(1);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const { data, isLoading, isError } = useEvents({
    page,
    severityFilter,
    statusFilter,
    typeFilter,
  });

  const events = data?.items || [];
  const total = data?.pagination?.total || 0;

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
        <div className='mb-4 flex flex-wrap items-center justify-between gap-4'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>Sự kiện hệ thống</h2>
            <p className='text-muted-foreground'>
              Giám sát sự kiện và nhắc nhở được phát hiện bởi AI
            </p>
          </div>
        </div>

        {/* Summary Section */}
        <EventSummaryCards events={events} total={total} />

        <div className='mb-4 flex flex-wrap items-center justify-between gap-4'>
          <div>
            <h3 className='text-lg font-semibold'>Chi tiết sự kiện</h3>
            <p className='text-muted-foreground text-sm'>
              Xem danh sách chi tiết các sự kiện phát hiện
            </p>
          </div>
          <EventFilters
            severityFilter={severityFilter}
            statusFilter={statusFilter}
            typeFilter={typeFilter}
            onSeverityChange={setSeverityFilter}
            onStatusChange={setStatusFilter}
            onTypeChange={setTypeFilter}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sự kiện gần đây</CardTitle>
          </CardHeader>
          <CardContent>
            {isError ? (
              <div className='text-muted-foreground py-8 text-center'>Không thể tải sự kiện</div>
            ) : isLoading ? (
              <div className='text-muted-foreground py-8 text-center'>Đang tải sự kiện...</div>
            ) : events.length === 0 ? (
              <div className='text-muted-foreground py-8 text-center'>
                Không tìm thấy sự kiện nào
              </div>
            ) : (
              <EventList
                events={events}
                total={total}
                page={page}
                pageSize={DEFAULT_PAGE_SIZE}
                onPageChange={setPage}
              />
            )}
          </CardContent>
        </Card>
      </Main>
    </>
  );
}
