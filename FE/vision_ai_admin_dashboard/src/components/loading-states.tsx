import { AlertTriangle, CloudOff, RefreshCw, WifiOff } from 'lucide-react';

import React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// Skeleton for stat cards
export function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
        <Skeleton className='h-4 w-24' />
        <Skeleton className='h-4 w-4' />
      </CardHeader>
      <CardContent>
        <Skeleton className='mb-2 h-8 w-16' />
        <Skeleton className='h-3 w-32' />
      </CardContent>
    </Card>
  );
}

// Skeleton for table rows
export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, index) => (
        <td key={index} className='px-4 py-2'>
          <Skeleton className='h-4 w-full' />
        </td>
      ))}
    </tr>
  );
}

// Skeleton for the recent sales table
export function RecentSalesTableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className='h-6 w-48' />
        <Skeleton className='h-4 w-64' />
      </CardHeader>
      <CardContent>
        <div className='space-y-3'>
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className='flex items-center space-x-4'>
              <Skeleton className='h-9 w-9 rounded-full' />
              <div className='flex-1 space-y-2'>
                <Skeleton className='h-4 w-32' />
                <Skeleton className='h-3 w-48' />
              </div>
              <div className='space-y-2'>
                <Skeleton className='h-4 w-16' />
                <Skeleton className='h-3 w-12' />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Skeleton for dashboard overview
export function DashboardOverviewSkeleton() {
  return (
    <div className='space-y-4'>
      {/* Stats grid */}
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        {Array.from({ length: 3 }).map((_, index) => (
          <StatCardSkeleton key={index} />
        ))}
      </div>

      {/* Charts and tables */}
      <div className='grid grid-cols-1 gap-4'>
        <div className='col-span-1 space-y-4'>
          <Card>
            <CardHeader>
              <Skeleton className='h-6 w-48' />
              <Skeleton className='h-4 w-64' />
            </CardHeader>
            <CardContent>
              <Skeleton className='h-64 w-full' />
            </CardContent>
          </Card>
        </div>
        <div className='col-span-1 space-y-4 md:col-span-3'>
          <RecentSalesTableSkeleton />
        </div>
      </div>
    </div>
  );
}

// Error state components
interface ErrorStateProps {
  title: string;
  message: string;
  icon?: React.ReactNode;
  onRetry?: () => void;
  retryText?: string;
  showRefreshPage?: boolean;
}

export function ErrorState({
  title,
  message,
  icon,
  onRetry,
  retryText = 'Thử lại',
  showRefreshPage = true,
}: ErrorStateProps) {
  return (
    <Card className='w-full'>
      <CardContent className='flex flex-col items-center justify-center py-12 text-center'>
        <div className='text-muted-foreground mb-4'>
          {icon || <AlertTriangle className='h-12 w-12' />}
        </div>
        <h3 className='mb-2 text-lg font-semibold'>{title}</h3>
        <p className='text-muted-foreground mb-6 max-w-md'>{message}</p>
        <div className='flex gap-2'>
          {onRetry && (
            <Button onClick={onRetry} variant='outline' className='flex items-center gap-2'>
              <RefreshCw className='h-4 w-4' />
              {retryText}
            </Button>
          )}
          {showRefreshPage && (
            <Button onClick={() => window.location.reload()}>Tải lại trang</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Specific error states
export function NetworkErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorState
      title='Lỗi kết nối mạng'
      message='Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng và thử lại.'
      icon={<WifiOff className='h-12 w-12' />}
      onRetry={onRetry}
    />
  );
}

export function DatabaseErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorState
      title='Lỗi cơ sở dữ liệu'
      message='Hệ thống cơ sở dữ liệu đang gặp sự cố tạm thời. Vui lòng thử lại sau ít phút.'
      icon={<CloudOff className='h-12 w-12' />}
      onRetry={onRetry}
      retryText='Thử lại ngay'
    />
  );
}

export function ServerErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorState
      title='Lỗi server'
      message='Server đang gặp sự cố. Chúng tôi đang khắc phục vấn đề này.'
      icon={<AlertTriangle className='h-12 w-12' />}
      onRetry={onRetry}
    />
  );
}

// Widget-specific error state
interface WidgetErrorStateProps {
  widgetName: string;
  onRetry?: () => void;
  compact?: boolean;
}

export function WidgetErrorState({ widgetName, onRetry, compact = false }: WidgetErrorStateProps) {
  if (compact) {
    return (
      <div className='flex flex-col items-center justify-center py-6 text-center text-sm'>
        <AlertTriangle className='text-muted-foreground mb-2 h-6 w-6' />
        <p className='text-muted-foreground mb-2'>Không thể tải {widgetName}</p>
        {onRetry && (
          <Button onClick={onRetry} variant='outline' size='sm'>
            Thử lại
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardContent className='flex flex-col items-center justify-center py-8 text-center'>
        <AlertTriangle className='text-muted-foreground mb-2 h-8 w-8' />
        <h3 className='mb-1 text-sm font-medium'>Không thể tải {widgetName}</h3>
        <p className='text-muted-foreground mb-4 text-xs'>Dữ liệu tạm thời không khả dụng</p>
        {onRetry && (
          <Button onClick={onRetry} variant='outline' size='sm'>
            <RefreshCw className='mr-1 h-3 w-3' />
            Thử lại
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// Loading states with timeout fallback
interface LoadingWithTimeoutProps {
  children: React.ReactNode;
  loadingSkeleton: React.ReactNode;
  errorFallback: React.ReactNode;
  isLoading: boolean;
  isError: boolean;
  timeout?: number; // milliseconds
}

export function LoadingWithTimeout({
  children,
  loadingSkeleton,
  errorFallback,
  isLoading,
  isError,
  timeout = 10000, // 10 seconds default
}: LoadingWithTimeoutProps) {
  const [hasTimedOut, setHasTimedOut] = React.useState(false);

  React.useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setHasTimedOut(true);
      }, timeout);

      return () => clearTimeout(timer);
    } else {
      setHasTimedOut(false);
    }
  }, [isLoading, timeout]);

  if (isError) {
    return <>{errorFallback}</>;
  }

  if (isLoading) {
    if (hasTimedOut) {
      return (
        <ErrorState
          title='Tải dữ liệu quá lâu'
          message='Việc tải dữ liệu đang mất nhiều thời gian hơn bình thường. Có thể server đang gặp sự cố.'
          onRetry={() => window.location.reload()}
          retryText='Tải lại'
        />
      );
    }
    return <>{loadingSkeleton}</>;
  }

  return <>{children}</>;
}
