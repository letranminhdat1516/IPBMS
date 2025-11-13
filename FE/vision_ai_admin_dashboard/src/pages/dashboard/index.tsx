import { format } from 'date-fns';
import { UserPlus, Users } from 'lucide-react';
import { DateRange } from 'react-day-picker';

import { useMemo, useState } from 'react';

import { Header } from '@/components/layout/header';
import { Main } from '@/components/layout/main';
import { TopNav } from '@/components/layout/top-nav';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import DateRangePicker from '@/components/date-range-picker';
import { DashboardErrorBoundary } from '@/components/error-boundary';
import {
  DashboardOverviewSkeleton,
  DatabaseErrorState,
  ErrorState,
  LoadingWithTimeout,
  NetworkErrorState,
} from '@/components/loading-states';
import { ProfileDropdown } from '@/components/profile-dropdown';
import { Search } from '@/components/search';
import { ThemeSwitch } from '@/components/theme-switch';

import { isRetryableError, useManualRetry, useRetryableQuery } from '@/hooks/use-retry';

import { getDashboardOverview } from '@/services/dashboard';

import MostUsedPlanCard from './components/most-used-plan-card';
import RecentPaymentsList from './components/recent-payments-list';
import ReportRequestCustomer from './components/report-request-customer';
import { StatCard } from './components/stat-card';
import { topNav } from './data/data';

export default function Dashboard() {
  // Khoảng thời gian mặc định: 7 ngày gần nhất
  const [range, setRange] = useState<DateRange | undefined>(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 6);
    return { from, to };
  });

  // Count comes from backend (overview.newUsersInRange)

  // Active preset detection
  const activePreset = useMemo(() => {
    if (!range?.from || !range?.to) return undefined as 'today' | '7days' | 'month' | undefined;
    const today = new Date();
    const isSameDate = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();

    const from = new Date(range.from.getFullYear(), range.from.getMonth(), range.from.getDate());
    const to = new Date(range.to.getFullYear(), range.to.getMonth(), range.to.getDate());

    // Today preset
    if (isSameDate(from, today) && isSameDate(to, today)) return 'today';

    // 7 days preset (last 7 days including today)
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6);
    if (isSameDate(from, sevenDaysAgo) && isSameDate(to, today)) return '7days';

    // This month preset
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    if (isSameDate(from, monthStart) && isSameDate(to, today)) return 'month';

    return undefined;
  }, [range]);

  // Use retryable query instead of regular useQuery
  const {
    data: overview,
    isLoading,
    error,
  } = useRetryableQuery({
    queryKey: ['dashboard-overview', range],
    queryFn: () =>
      getDashboardOverview({
        from: (range?.from ?? new Date()).toISOString().slice(0, 10),
        to: (range?.to ?? new Date()).toISOString().slice(0, 10),
      }),
    maxRetries: 3,
    initialDelay: 1000,
    retryCondition: (error) => isRetryableError(error),
  });

  const { retry: manualRetry } = useManualRetry();

  // Handle manual retry
  const handleRetry = async () => {
    await manualRetry(['dashboard-overview', range], () =>
      getDashboardOverview({
        from: (range?.from ?? new Date()).toISOString().slice(0, 10),
        to: (range?.to ?? new Date()).toISOString().slice(0, 10),
      })
    );
  };

  // Determine error type for appropriate error component
  const renderErrorState = () => {
    if (!error) return null;

    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
      return <NetworkErrorState onRetry={handleRetry} />;
    }

    if (errorMessage.includes('prepared statement') || errorMessage.includes('database')) {
      return <DatabaseErrorState onRetry={handleRetry} />;
    }

    // Default error state
    return (
      <ErrorState
        title='Không thể tải dữ liệu dashboard'
        message='Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại.'
        onRetry={handleRetry}
      />
    );
  };

  const dashboardStats = {
    totalCustomers: {
      value: overview?.totalCustomers ?? 0,
      change: 0,
      changeText: '',
    },
    newUsersInRange: {
      value: overview?.newUsersInRange ?? 0,
      change: 0,
      changeText:
        range?.from && range?.to
          ? `${format(range.from, 'dd/MM/yyyy')} - ${format(range.to, 'dd/MM/yyyy')}`
          : 'Chọn khoảng thời gian',
    },
    newRegistrations: {
      value: overview?.newRegistrations ?? 0,
      change: 0,
      changeText: '',
    },
    monitoredPatients: {
      value: overview?.monitoredPatients ?? 0,
      change: 0,
      changeText: '',
    },
  } as const;

  return (
    <>
      {/* ===== Top Heading ===== */}
      <Header>
        <TopNav links={topNav} />
        <div className='ml-auto flex items-center space-x-4'>
          <Search />
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      {/* ===== Main ===== */}
      <Main>
        <div className='mb-2 flex items-center justify-between space-y-2'>
          <div className='flex items-center gap-4'>
            <h1 className='text-2xl font-bold tracking-tight'>Bảng Điều Khiển </h1>
          </div>
          <div className='flex items-center gap-2'>
            <DateRangePicker selected={range} onSelect={setRange} />
            <div className='hidden items-center gap-1 sm:flex'>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={activePreset === 'today' ? 'default' : 'outline'}
                    size='sm'
                    onClick={() => {
                      const to = new Date();
                      const from = new Date(to.getFullYear(), to.getMonth(), to.getDate());
                      setRange({ from, to });
                    }}
                  >
                    Hôm nay
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Chỉ hiển thị dữ liệu của hôm nay</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={activePreset === '7days' ? 'default' : 'outline'}
                    size='sm'
                    onClick={() => {
                      const to = new Date();
                      const from = new Date();
                      from.setDate(to.getDate() - 6);
                      setRange({ from, to });
                    }}
                  >
                    7 ngày
                  </Button>
                </TooltipTrigger>
                <TooltipContent>7 ngày gần nhất (bao gồm hôm nay)</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={activePreset === 'month' ? 'default' : 'outline'}
                    size='sm'
                    onClick={() => {
                      const to = new Date();
                      const from = new Date(to.getFullYear(), to.getMonth(), 1);
                      setRange({ from, to });
                    }}
                  >
                    Tháng này
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Từ đầu tháng đến hôm nay</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

        <Tabs orientation='vertical' defaultValue='overview' className='space-y-4'>
          <div className='w-full overflow-x-auto pb-2'>
            <TabsList>
              <TabsTrigger value='overview'>
                <span title='Tổng quan về bệnh viện'>🏥 Tổng quan</span>
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value='overview' className='space-y-4'>
            <LoadingWithTimeout
              isLoading={isLoading}
              isError={!!error}
              loadingSkeleton={<DashboardOverviewSkeleton />}
              errorFallback={renderErrorState()}
              timeout={15000}
            >
              <div className='space-y-4'>
                {/* Card thống kê dùng chung */}
                <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3'>
                  <DashboardErrorBoundary widgetName='thống kê khách hàng' onRetry={handleRetry}>
                    <div className='relative'>
                      <StatCard
                        icon={<Users className='text-muted-foreground h-8 w-4' />}
                        title='Tổng số khách hàng'
                        value={dashboardStats.totalCustomers.value}
                        changeText={dashboardStats.totalCustomers.changeText}
                        trend={'up'}
                        isLoading={isLoading}
                      />
                    </div>
                  </DashboardErrorBoundary>

                  <DashboardErrorBoundary widgetName='người dùng mới' onRetry={handleRetry}>
                    <div className='relative'>
                      <StatCard
                        icon={<UserPlus className='text-muted-foreground h-8 w-4' />}
                        title='Người dùng mới (khoảng thời gian)'
                        value={dashboardStats.newUsersInRange.value}
                        changeText={dashboardStats.newUsersInRange.changeText}
                        trend={'neutral'}
                        isLoading={isLoading}
                      />
                    </div>
                  </DashboardErrorBoundary>

                  <DashboardErrorBoundary widgetName='Gói dịch vụ phổ biến' onRetry={handleRetry}>
                    <div className='relative'>
                      <MostUsedPlanCard />
                    </div>
                  </DashboardErrorBoundary>
                </div>
              </div>

              <div className='grid grid-cols-1 gap-4'>
                <div className='col-span-1 space-y-4'>
                  <DashboardErrorBoundary widgetName='Báo cáo yêu cầu' onRetry={handleRetry}>
                    <ReportRequestCustomer
                      from={(range?.from ?? new Date()).toISOString().slice(0, 10)}
                      to={(range?.to ?? new Date()).toISOString().slice(0, 10)}
                    />
                  </DashboardErrorBoundary>
                </div>
              </div>

              {/* Recent payments / recent sales */}
              <div className='grid grid-cols-1 gap-4'>
                <DashboardErrorBoundary
                  widgetName='Người dùng thanh toán gần đây'
                  onRetry={handleRetry}
                >
                  <Card>
                    <CardHeader className='border-b'>
                      <CardTitle>Người dùng thanh toán gần đây</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <RecentPaymentsList
                        from={(range?.from ?? new Date()).toISOString().slice(0, 10)}
                        to={(range?.to ?? new Date()).toISOString().slice(0, 10)}
                      />
                    </CardContent>
                  </Card>
                </DashboardErrorBoundary>
              </div>
            </LoadingWithTimeout>
          </TabsContent>
        </Tabs>
      </Main>
    </>
  );
}
