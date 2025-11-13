import { toast } from 'sonner';

import {
  type DashboardError,
  classifyError,
  dashboardErrorTracker,
} from '@/utils/dashboard-errors';

export interface ErrorInterceptor {
  onError: (error: unknown, context?: string) => void;
  onRetry: (error: unknown, attempt: number) => void;
  onSuccess: (context?: string) => void;
  getHealthStatus: () => { isHealthy: boolean; details: string };
}

class GlobalErrorInterceptor implements ErrorInterceptor {
  private errorCounts = new Map<string, number>();
  private lastErrorTime = new Map<string, number>();
  private readonly ERROR_THRESHOLD = 5; // Max errors per context in 5 minutes
  private readonly TIME_WINDOW = 5 * 60 * 1000; // 5 minutes

  onError(error: unknown, context = 'unknown'): void {
    const classifiedError = classifyError(error);
    dashboardErrorTracker.addError(classifiedError);

    // Track error frequency by context
    this.trackErrorFrequency(context);

    // Check if we should suppress notifications (too many errors)
    if (this.shouldSuppressNotification(context)) {
      return;
    }

    // Log error for debugging (removed in production)

    // Show user-friendly notification based on error type and frequency
    this.showErrorNotification(classifiedError, context);
  }

  onRetry(_error: unknown, attempt: number): void {
    // Retry logging removed in production

    // Show retry notification only for significant attempts
    if (attempt >= 2) {
      toast.loading(`Đang thử lại... (lần ${attempt})`, {
        duration: 2000,
        id: `retry-${attempt}`,
      });
    }
  }

  onSuccess(context = 'unknown'): void {
    // Reset error count for this context on success
    this.errorCounts.delete(context);
    this.lastErrorTime.delete(context);

    // Record success for health monitoring
    dashboardErrorTracker.getErrorStats(); // This updates internal state
  }

  getHealthStatus(): { isHealthy: boolean; details: string } {
    const stats = dashboardErrorTracker.getErrorStats();
    const recentErrorContexts = Array.from(this.errorCounts.entries()).filter(
      ([, count]) => count >= this.ERROR_THRESHOLD
    );

    if (stats.isUnhealthy || recentErrorContexts.length > 0) {
      const details = [
        stats.isUnhealthy ? 'Database issues detected' : '',
        recentErrorContexts.length > 0
          ? `High error rate in: ${recentErrorContexts.map(([ctx]) => ctx).join(', ')}`
          : '',
      ]
        .filter(Boolean)
        .join('; ');

      return {
        isHealthy: false,
        details: details || 'System experiencing issues',
      };
    }

    return {
      isHealthy: true,
      details: 'All systems operational',
    };
  }

  private trackErrorFrequency(context: string): void {
    const now = Date.now();
    const lastError = this.lastErrorTime.get(context) || 0;

    // Reset count if last error was more than TIME_WINDOW ago
    if (now - lastError > this.TIME_WINDOW) {
      this.errorCounts.set(context, 1);
    } else {
      this.errorCounts.set(context, (this.errorCounts.get(context) || 0) + 1);
    }

    this.lastErrorTime.set(context, now);
  }

  private shouldSuppressNotification(context: string): boolean {
    const errorCount = this.errorCounts.get(context) || 0;
    return errorCount > this.ERROR_THRESHOLD;
  }

  private showErrorNotification(classifiedError: DashboardError, context: string): void {
    const errorCount = this.errorCounts.get(context) || 0;

    // Different notification strategies based on error frequency
    if (errorCount === 1) {
      // First error - show detailed message
      this.showDetailedErrorNotification(classifiedError);
    } else if (errorCount <= 3) {
      // Multiple errors - show condensed message
      this.showCondensedErrorNotification(classifiedError, errorCount);
    } else if (errorCount === this.ERROR_THRESHOLD) {
      // Threshold reached - show warning about suppression
      toast.error('Quá nhiều lỗi đã xảy ra', {
        description: 'Tạm thời ẩn thông báo lỗi. Hệ thống đang khôi phục.',
        duration: 8000,
      });
    }
    // Above threshold - notifications are suppressed
  }

  private showDetailedErrorNotification(classifiedError: DashboardError): void {
    switch (classifiedError.type) {
      case 'network':
        toast.error('Lỗi kết nối mạng', {
          description: 'Kiểm tra kết nối internet. Hệ thống sẽ tự động thử lại.',
          action: {
            label: 'Kiểm tra',
            onClick: () => window.open('https://google.com', '_blank'),
          },
          duration: 6000,
        });
        break;
      case 'database':
        toast.error('Cơ sở dữ liệu tạm thời không khả dụng', {
          description: 'Hệ thống đang khôi phục. Dữ liệu sẽ được tải lại tự động.',
          duration: 8000,
        });
        break;
      case 'server':
        toast.error('Lỗi server', {
          description: 'Đội ngũ kỹ thuật đã được thông báo và đang khắc phục.',
          duration: 6000,
        });
        break;
      case 'timeout':
        toast.error('Yêu cầu hết thời gian chờ', {
          description: 'Server đang quá tải. Hệ thống sẽ thử lại với thời gian chờ lâu hơn.',
          duration: 5000,
        });
        break;
      default:
        toast.error('Có lỗi xảy ra', {
          description: classifiedError.userMessage,
          duration: 4000,
        });
    }
  }

  private showCondensedErrorNotification(_classifiedError: DashboardError, count: number): void {
    toast.error(`Lỗi tiếp tục xảy ra (${count} lần)`, {
      description: 'Hệ thống đang cố gắng khôi phục. Vui lòng đợi trong giây lát.',
      duration: 3000,
    });
  }
}

// Singleton instance
export const globalErrorInterceptor = new GlobalErrorInterceptor();

// React hook for components to easily use error interceptor
export function useErrorInterceptor(context?: string) {
  const reportError = (error: unknown) => {
    globalErrorInterceptor.onError(error, context);
  };

  const reportRetry = (error: unknown, attempt: number) => {
    globalErrorInterceptor.onRetry(error, attempt);
  };

  const reportSuccess = () => {
    globalErrorInterceptor.onSuccess(context);
  };

  const getHealth = () => {
    return globalErrorInterceptor.getHealthStatus();
  };

  return {
    reportError,
    reportRetry,
    reportSuccess,
    getHealth,
  };
}
