import { AlertTriangle, RefreshCw } from 'lucide-react';

import React, { Component, ReactNode } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  showDetails?: boolean;
  onRetry?: () => void;
  retryText?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isNetworkError =
        this.state.error?.message?.includes('fetch') ||
        this.state.error?.message?.includes('network') ||
        this.state.error?.message?.includes('Failed to fetch');

      const isDatabaseError =
        this.state.error?.message?.includes('prepared statement') ||
        this.state.error?.message?.includes('database') ||
        this.state.error?.message?.includes('prisma');

      return (
        <Card className='w-full'>
          <CardHeader>
            <CardTitle className='text-destructive flex items-center gap-2'>
              <AlertTriangle className='h-5 w-5' />
              Có lỗi xảy ra
            </CardTitle>
            <CardDescription>
              {isNetworkError && 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.'}
              {isDatabaseError && 'Lỗi cơ sở dữ liệu tạm thời. Hệ thống đang được khôi phục.'}
              {!isNetworkError && !isDatabaseError && 'Đã xảy ra lỗi không mong muốn.'}
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <Alert>
              <AlertTriangle className='h-4 w-4' />
              <AlertTitle>Thông tin lỗi</AlertTitle>
              <AlertDescription>
                {this.state.error?.message || 'Lỗi không xác định'}
              </AlertDescription>
            </Alert>

            <div className='flex gap-2'>
              <Button
                onClick={this.handleRetry}
                variant='outline'
                size='sm'
                className='flex items-center gap-2'
              >
                <RefreshCw className='h-4 w-4' />
                {this.props.retryText || 'Thử lại'}
              </Button>
              <Button onClick={() => window.location.reload()} variant='default' size='sm'>
                Tải lại trang
              </Button>
            </div>

            {this.props.showDetails && this.state.errorInfo && (
              <details className='mt-4'>
                <summary className='cursor-pointer text-sm font-medium'>Chi tiết kỹ thuật</summary>
                <pre className='bg-muted mt-2 max-h-32 overflow-auto rounded p-2 text-xs'>
                  {this.state.error?.stack}
                  {'\n\nComponent Stack:'}
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Specialized error boundary for dashboard widgets
interface DashboardErrorBoundaryProps {
  children: ReactNode;
  widgetName: string;
  onRetry?: () => void;
}

export function DashboardErrorBoundary({
  children,
  widgetName,
  onRetry,
}: DashboardErrorBoundaryProps) {
  return (
    <ErrorBoundary
      onRetry={onRetry}
      retryText='Tải lại dữ liệu'
      fallback={
        <Card className='w-full'>
          <CardContent className='flex flex-col items-center justify-center py-8 text-center'>
            <AlertTriangle className='text-muted-foreground mb-2 h-8 w-8' />
            <h3 className='mb-1 text-sm font-medium'>Không thể tải {widgetName}</h3>
            <p className='text-muted-foreground mb-4 text-xs'>Dữ liệu tạm thời không khả dụng</p>
            <Button
              onClick={onRetry}
              variant='outline'
              size='sm'
              className='flex items-center gap-1'
            >
              <RefreshCw className='h-3 w-3' />
              Thử lại
            </Button>
          </CardContent>
        </Card>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
