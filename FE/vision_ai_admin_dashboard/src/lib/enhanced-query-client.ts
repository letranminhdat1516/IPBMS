import { toast } from 'sonner';

import { QueryCache, QueryClient } from '@tanstack/react-query';

import {
  classifyError,
  dashboardErrorTracker,
  getRetryDelay,
  shouldRetryError,
} from '@/utils/dashboard-errors';

export interface EnhancedQueryClientConfig {
  onAuthError?: () => void;
  onServerError?: (error: unknown) => void;
  onForbiddenError?: () => void;
  enableDetailedLogging?: boolean;
  customRetryDelay?: (attempt: number, error: unknown) => number;
}

function getHttpStatus(err: unknown): number {
  if (typeof err === 'object' && err && 'status' in err && typeof err.status === 'number') {
    return err.status;
  }
  return 0;
}

// Enhanced retry function with smart error classification
function intelligentRetry(failureCount: number, error: unknown): boolean {
  // Log in development only for debugging (removed in production)

  // Classify the error
  const classifiedError = classifyError(error);
  dashboardErrorTracker.addError(classifiedError);

  // Don't retry non-retryable errors
  if (!shouldRetryError(classifiedError)) {
    return false;
  }

  // Don't retry HTTP errors that shouldn't be retried
  const status = getHttpStatus(error);
  if ([400, 401, 403, 404, 422].includes(status)) {
    return false;
  }

  // Different retry limits based on error type
  const maxRetries = (() => {
    switch (classifiedError.type) {
      case 'network':
        return 2; // Quick network retries
      case 'database':
        return 5; // More retries for DB issues
      case 'server':
        return 3; // Standard server error retries
      case 'timeout':
        return 2; // Quick timeout retries
      default:
        return 3; // Default
    }
  })();

  return failureCount < maxRetries;
}

// Smart retry delay function
function getIntelligentRetryDelay(failureCount: number, error: unknown): number {
  const classifiedError = classifyError(error);
  return getRetryDelay(classifiedError, failureCount);
}

// Error notification handler
function handleQueryError(error: unknown) {
  const classifiedError = classifyError(error);
  const status = getHttpStatus(error);

  // Track error for health monitoring
  dashboardErrorTracker.addError(classifiedError);

  // Don't show toast for authentication errors (handled by QueryCache)
  if ([401, 403].includes(status)) {
    return;
  }

  // Show appropriate error message based on error type
  switch (classifiedError.type) {
    case 'network':
      toast.error('Lỗi kết nối mạng', {
        description: 'Kiểm tra kết nối internet và thử lại',
        duration: 5000,
      });
      break;
    case 'database':
      toast.error('Lỗi cơ sở dữ liệu', {
        description: 'Hệ thống đang khôi phục, vui lòng đợi',
        duration: 7000,
      });
      break;
    case 'server':
      if (status === 500) {
        toast.error('Lỗi server nội bộ', {
          description: 'Chúng tôi đang khắc phục sự cố',
          duration: 6000,
        });
      } else {
        toast.error('Lỗi server', {
          description: classifiedError.userMessage,
          duration: 5000,
        });
      }
      break;
    case 'timeout':
      toast.error('Hết thời gian chờ', {
        description: 'Yêu cầu mất quá nhiều thời gian',
        duration: 4000,
      });
      break;
    default:
      // Only show generic error if we don't have specific handling
      if (!status || status >= 500) {
        toast.error('Có lỗi xảy ra', {
          description: 'Vui lòng thử lại sau',
          duration: 4000,
        });
      }
  }
}

export function createEnhancedQueryClient(config: EnhancedQueryClientConfig = {}): QueryClient {
  const { onAuthError, onServerError, onForbiddenError, enableDetailedLogging = false } = config;

  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: intelligentRetry,
        retryDelay: getIntelligentRetryDelay,
        refetchOnWindowFocus: 'always',
        staleTime: 10 * 1000, // 10s
        gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
        // Avoid refetching too aggressively when there are errors
        refetchOnReconnect: 'always',
        refetchInterval: false, // Disable automatic polling to reduce load during errors
      },
      mutations: {
        retry: (failureCount, error) => {
          const classifiedError = classifyError(error);
          return shouldRetryError(classifiedError) && failureCount < 2;
        },
        retryDelay: getIntelligentRetryDelay,
        onError: handleQueryError,
      },
    },
    queryCache: new QueryCache({
      onError: (error, query) => {
        const status = getHttpStatus(error);

        if (enableDetailedLogging && import.meta.env.DEV) {
          // Query error logging removed in production
        }

        // Special handling for authentication errors
        if (status === 401) {
          toast.error('Phiên làm việc đã hết hạn', {
            description: 'Vui lòng đăng nhập lại',
            duration: 5000,
          });
          if (onAuthError) {
            onAuthError();
          }
          return;
        }

        if (status === 403) {
          toast.error('Không có quyền truy cập', {
            description: 'Bạn không có quyền thực hiện hành động này',
            duration: 5000,
          });
          if (onForbiddenError) {
            onForbiddenError();
          }
          return;
        }

        if (status >= 500) {
          if (onServerError) {
            onServerError(error);
          }
          return;
        }

        // For critical queries (like dashboard overview), provide specific guidance
        if (query.queryKey[0] === 'dashboard-overview') {
          const classifiedError = classifyError(error);
          if (classifiedError.type === 'database') {
            toast.error('Dashboard tạm thời không khả dụng', {
              description: 'Cơ sở dữ liệu đang được khôi phục. Trang sẽ tự động tải lại.',
              duration: 10000,
            });
          }
        }

        // Generic error handling
        handleQueryError(error);
      },
    }),
  });
}

// Health check utilities
export function getSystemHealth() {
  const stats = dashboardErrorTracker.getErrorStats();
  return {
    isHealthy: !stats.isUnhealthy,
    errorCount: stats.total,
    errorsByType: stats.byType,
    lastCheck: new Date(),
  };
}

// Export enhanced query client instance
export const enhancedQueryClient = createEnhancedQueryClient();
