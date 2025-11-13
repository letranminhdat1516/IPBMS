import { AlertTriangle, Bell, TrendingUp } from 'lucide-react';

import React, { useState } from 'react';

import { useQuery } from '@tanstack/react-query';

import { Header } from '@/components/layout/header';
import { Main } from '@/components/layout/main';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { PaginationBar } from '@/components/pagination-bar';
import { ProfileDropdown } from '@/components/profile-dropdown';
import { Search } from '@/components/search';
import { ThemeSwitch } from '@/components/theme-switch';

import { useSEO } from '@/hooks/use-seo';

import type { Notification } from '@/types/notification';

import { getNotifications } from '@/services/notifications';

import { AlertFilters, AlertSummaryCards, AlertTable } from './components';

const DEFAULT_PAGE_SIZE = 20;

// Helper function to normalize alerts/notifications data from various API shapes
// Supports:
// - Array of Notification
// - { items: Notification[], pagination: { total } }
// - { data: Notification[], total, page, limit }
const normalizeAlertsData = (data: unknown): { items: Notification[]; total: number } => {
  if (!data) return { items: [], total: 0 };

  // If data is an array, treat it as direct alerts array
  if (Array.isArray(data)) {
    return {
      items: data.filter((item): item is Notification => {
        if (!item || typeof item !== 'object') return false;
        return 'notification_id' in item;
      }),
      total: data.length,
    };
  }

  const dataObj = data as Record<string, unknown>;

  // Helper to find the first reasonable array of notifications in nested response shapes
  const findNotificationArray = (obj: unknown): unknown[] | undefined => {
    if (!obj || typeof obj !== 'object') return undefined;
    const o = obj as Record<string, unknown>;
    // Direct array
    if (Array.isArray(obj)) return obj as unknown[];
    // obj.data could be array
    if (o.data && Array.isArray(o.data)) return o.data as unknown[];
    // obj.data could be wrapper with data inside (e.g., top-level { success: true, data: { data: [...] } })
    if (o.data && typeof o.data === 'object') {
      const inner = o.data as Record<string, unknown>;
      if (inner.data && Array.isArray(inner.data)) return inner.data as unknown[];
    }
    // items
    if (o.items && Array.isArray(o.items)) return o.items as unknown[];
    return undefined;
  };

  const found = findNotificationArray(dataObj);
  if (found) {
    const validItems = found.filter((item): item is Notification => {
      if (!item || typeof item !== 'object') return false;
      return 'notification_id' in item;
    });
    // Try to pull total from common places
    const totalFromObj =
      (dataObj.total as number) ??
      (dataObj.data && typeof dataObj.data === 'object'
        ? ((dataObj.data as Record<string, unknown>).total as number)
        : undefined);
    return {
      items: validItems,
      total: totalFromObj ?? validItems.length,
    };
  }

  // Case: { items: Notification[], pagination: { total } }
  if (dataObj.items && Array.isArray(dataObj.items)) {
    const validItems = (dataObj.items as unknown[]).filter((item): item is Notification => {
      if (!item || typeof item !== 'object') return false;
      return 'notification_id' in item;
    });

    return {
      items: validItems,
      total: (dataObj.pagination as { total?: number })?.total ?? validItems.length,
    };
  }

  // Fallback: empty array
  return { items: [], total: 0 };
};

export default function AlertsPage() {
  // SEO Configuration
  useSEO({
    title: 'Quản Lý Nhắc Nhở - Bảng Điều Khiển Vision AI',
    description:
      'Giám sát và quản lý nhắc nhở hệ thống, thông báo và sự kiện bảo mật trong hệ thống giám sát y tế Vision AI. Theo dõi nhắc nhở quan trọng, trạng thái hệ thống và thông báo bảo trì.',
    keywords:
      'nhắc nhở, thông báo, giám sát, bảo mật, nhắc nhở hệ thống, giám sát y tế, Vision AI, bảng điều khiển, panel quản trị',
    ogDescription:
      'Giám sát và quản lý nhắc nhở hệ thống, thông báo và sự kiện bảo mật trong hệ thống giám sát y tế Vision AI.',
    twitterTitle: 'Quản Lý Nhắc Nhở - Bảng Điều Khiển Vision AI',
    twitterDescription:
      'Giám sát và quản lý nhắc nhở hệ thống, thông báo và sự kiện bảo mật trong hệ thống giám sát y tế Vision AI.',
    author: 'Vision AI Team',
    canonical: window.location.origin + '/alerts',
  });

  const [activeTab, setActiveTab] = useState('alerts');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const {
    data: alertsData,
    isLoading: alertsLoading,
    isError: alertsError,
  } = useQuery({
    queryKey: ['alerts', page, statusFilter, severityFilter, typeFilter],
    queryFn: () =>
      getNotifications({
        page,
        limit: DEFAULT_PAGE_SIZE,
        status: statusFilter === 'all' ? undefined : statusFilter,
        type: typeFilter === 'all' ? undefined : typeFilter,
      }),
    enabled: activeTab === 'alerts',
  });

  const normalizedData = normalizeAlertsData(alertsData);
  // Prefer direct alertsData.data when present (common after API unwrapping),
  // otherwise fall back to normalized items.
  const alerts = React.useMemo<Notification[]>(() => {
    if (alertsData && typeof alertsData === 'object') {
      const a = alertsData as Record<string, unknown>;
      if (a.data && Array.isArray(a.data)) return a.data as Notification[];
    }
    return normalizedData.items;
  }, [alertsData, normalizedData]);

  const total = normalizedData.total;

  // Calculate summary from alerts data
  const summary = React.useMemo(() => {
    if (!alerts || alerts.length === 0) {
      return {
        total: 0,
        pending: 0,
        critical: 0,
        resolved: 0,
      };
    }

    return {
      total: alerts.length,
      pending: alerts.filter((alert) => alert?.status === 'pending').length,
      critical: alerts.filter((alert) => alert?.severity === 'critical').length,
      resolved: alerts.filter((alert) => alert?.status === 'resolved').length,
    };
  }, [alerts]);

  // Note: date formatting is handled inside the table component now.

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
            <h2 className='text-2xl font-bold tracking-tight'>Nhắc Nhở</h2>
            <p className='text-muted-foreground'>Giám sát nhắc nhở và thông báo hệ thống</p>
          </div>
        </div>

        {/* Summary Cards */}
        <AlertSummaryCards summary={summary} isLoading={alertsLoading} />

        <Tabs value={activeTab} onValueChange={setActiveTab} className='space-y-4'>
          <TabsList>
            <TabsTrigger value='alerts'>Nhắc Nhở</TabsTrigger>
            <TabsTrigger value='analytics'>Thống Kê</TabsTrigger>
          </TabsList>

          <TabsContent value='alerts' className='space-y-4'>
            <Card>
              <CardHeader>
                <div className='flex flex-wrap items-center justify-between gap-4'>
                  <CardTitle>Nhắc Nhở Hệ Thống</CardTitle>
                  <AlertFilters
                    statusFilter={statusFilter}
                    severityFilter={severityFilter}
                    typeFilter={typeFilter}
                    onStatusFilterChange={setStatusFilter}
                    onSeverityFilterChange={setSeverityFilter}
                    onTypeFilterChange={setTypeFilter}
                  />
                </div>
              </CardHeader>
              <CardContent>
                {alertsError ? (
                  <div className='flex flex-col items-center justify-center py-12 text-center'>
                    <AlertTriangle className='text-destructive mb-4 h-12 w-12' />
                    <h3 className='text-destructive mb-2 text-lg font-medium'>
                      Không thể tải nhắc nhở
                    </h3>
                    <p className='text-muted-foreground mb-6 max-w-md text-sm'>
                      Đã xảy ra lỗi khi tải danh sách nhắc nhở. Vui lòng kiểm tra kết nối mạng và
                      thử lại.
                    </p>
                    <div className='flex gap-2'>
                      <Button variant='outline' size='sm' onClick={() => window.location.reload()}>
                        Thử lại
                      </Button>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => {
                          setStatusFilter('all');
                          setSeverityFilter('all');
                          setTypeFilter('all');
                          setPage(1);
                        }}
                      >
                        Đặt lại bộ lọc
                      </Button>
                    </div>
                  </div>
                ) : alertsLoading ? (
                  <div className='text-muted-foreground py-8 text-center'>Đang tải nhắc nhở...</div>
                ) : alerts.length === 0 ? (
                  <div className='flex flex-col items-center justify-center py-12 text-center'>
                    <Bell className='text-muted-foreground mb-4 h-12 w-12' />
                    <h3 className='text-muted-foreground mb-2 text-lg font-medium'>
                      Không tìm thấy nhắc nhở nào
                    </h3>
                    <p className='text-muted-foreground mb-6 max-w-md text-sm'>
                      Hiện tại không có nhắc nhở nào phù hợp với bộ lọc đã chọn. Hãy thử điều chỉnh
                      bộ lọc hoặc kiểm tra lại sau.
                    </p>
                    <div className='flex gap-2'>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => {
                          setStatusFilter('all');
                          setSeverityFilter('all');
                          setTypeFilter('all');
                          setPage(1);
                        }}
                      >
                        Xóa bộ lọc
                      </Button>
                      <Button variant='outline' size='sm' onClick={() => window.location.reload()}>
                        Làm mới
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <AlertTable alerts={alerts} />
                    {/* Debug: show raw response and normalized data to help diagnose empty table */}
                    <details className='mt-4'>
                      <summary className='text-muted-foreground cursor-pointer text-sm'>
                        Debug: show API payload
                      </summary>
                      <pre className='bg-muted max-h-64 overflow-auto rounded border p-2 text-xs'>
                        {JSON.stringify(
                          {
                            alertsData,
                            normalizedData: {
                              total: normalizedData.total,
                              itemsCount: normalizedData.items.length,
                            },
                          },
                          null,
                          2
                        )}
                      </pre>
                    </details>
                    <div className='mt-4'>
                      <PaginationBar
                        page={page}
                        pageSize={DEFAULT_PAGE_SIZE}
                        total={total}
                        onPageChange={setPage}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='analytics' className='space-y-4'>
            <Card>
              <CardHeader>
                <CardTitle>Thống Kê Nhắc Nhở</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='flex flex-col items-center justify-center py-12 text-center'>
                  <TrendingUp className='text-muted-foreground mb-4 h-12 w-12' />
                  <h3 className='text-muted-foreground mb-2 text-lg font-medium'>
                    Tính năng thống kê đang phát triển
                  </h3>
                  <p className='text-muted-foreground mb-6 max-w-md text-sm'>
                    Bảng thống kê nhắc nhở với biểu đồ và phân tích chi tiết sẽ có sẵn trong phiên
                    bản sắp tới.
                  </p>
                  <div className='flex gap-2'>
                    <Button variant='outline' size='sm' onClick={() => setActiveTab('alerts')}>
                      Xem Nhắc Nhở
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </Main>
    </>
  );
}
