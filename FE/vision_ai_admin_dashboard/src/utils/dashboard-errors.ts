/**
 * Dashboard error handling utilities and types
 */

export type DashboardErrorType = 'network' | 'database' | 'server' | 'timeout' | 'unknown';

export interface DashboardError {
  type: DashboardErrorType;
  message: string;
  originalError?: unknown;
  timestamp: Date;
  retryable: boolean;
  userMessage: string;
}

export function classifyError(error: unknown): DashboardError {
  const timestamp = new Date();
  let type: DashboardErrorType = 'unknown';
  let message = 'Unknown error';
  let retryable = false;
  let userMessage = 'Đã xảy ra lỗi không mong muốn.';

  if (error instanceof Error) {
    message = error.message;
    const lowerMessage = message.toLowerCase();

    if (
      lowerMessage.includes('fetch') ||
      lowerMessage.includes('network') ||
      lowerMessage.includes('failed to fetch') ||
      lowerMessage.includes('connection')
    ) {
      type = 'network';
      retryable = true;
      userMessage = 'Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet.';
    } else if (
      lowerMessage.includes('prepared statement') ||
      lowerMessage.includes('database') ||
      lowerMessage.includes('prisma') ||
      lowerMessage.includes('query') ||
      lowerMessage.includes('does not exist')
    ) {
      type = 'database';
      retryable = true;
      userMessage = 'Cơ sở dữ liệu đang gặp sự cố tạm thời. Vui lòng thử lại sau ít phút.';
    } else if (lowerMessage.includes('timeout') || lowerMessage.includes('time out')) {
      type = 'timeout';
      retryable = true;
      userMessage = 'Yêu cầu hết thời gian chờ. Vui lòng thử lại.';
    } else if (
      lowerMessage.includes('server') ||
      lowerMessage.includes('500') ||
      lowerMessage.includes('502') ||
      lowerMessage.includes('503') ||
      lowerMessage.includes('504')
    ) {
      type = 'server';
      retryable = true;
      userMessage = 'Server đang gặp sự cố. Chúng tôi đang khắc phục vấn đề.';
    }
  } else if (typeof error === 'string') {
    message = error;
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('network') || lowerMessage.includes('fetch')) {
      type = 'network';
      retryable = true;
      userMessage = 'Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet.';
    }
  }

  return {
    type,
    message,
    originalError: error,
    timestamp,
    retryable,
    userMessage,
  };
}

export function shouldRetryError(error: DashboardError): boolean {
  return error.retryable;
}

export function getErrorMessage(error: DashboardError): string {
  return error.userMessage;
}

export function getErrorTitle(error: DashboardError): string {
  switch (error.type) {
    case 'network':
      return 'Lỗi kết nối mạng';
    case 'database':
      return 'Lỗi cơ sở dữ liệu';
    case 'server':
      return 'Lỗi server';
    case 'timeout':
      return 'Hết thời gian chờ';
    default:
      return 'Lỗi hệ thống';
  }
}

export function getRetryDelay(error: DashboardError, attemptNumber: number): number {
  const baseDelay = 1000; // 1 second
  const maxDelay = 30000; // 30 seconds

  switch (error.type) {
    case 'network':
      // Quick retry for network errors
      return Math.min(baseDelay * Math.pow(1.5, attemptNumber), 5000);
    case 'database':
      // Longer delay for database errors
      return Math.min(baseDelay * Math.pow(2, attemptNumber), maxDelay);
    case 'server':
      // Medium delay for server errors
      return Math.min(baseDelay * Math.pow(1.8, attemptNumber), 15000);
    case 'timeout':
      // Progressive delay for timeouts
      return Math.min(baseDelay * Math.pow(2, attemptNumber), 10000);
    default:
      return Math.min(baseDelay * Math.pow(2, attemptNumber), maxDelay);
  }
}

// Error recovery strategies
export interface ErrorRecoveryStrategy {
  shouldRetry: boolean;
  retryDelay: number;
  maxRetries: number;
  fallbackData?: unknown;
  userAction?: string;
}

export function getErrorRecoveryStrategy(
  error: DashboardError,
  attemptNumber: number = 0
): ErrorRecoveryStrategy {
  const maxRetries = error.type === 'database' ? 5 : 3;
  const shouldRetry = error.retryable && attemptNumber < maxRetries;
  const retryDelay = getRetryDelay(error, attemptNumber);

  let userAction = 'Thử lại';
  let fallbackData: unknown = undefined;

  switch (error.type) {
    case 'network':
      userAction = 'Kiểm tra kết nối và thử lại';
      break;
    case 'database':
      userAction = 'Đợi một chút và thử lại';
      // Provide fallback data for dashboard
      fallbackData = {
        totalCustomers: 0,
        newUsersInRange: 0,
        newRegistrations: 0,
        monitoredPatients: 0,
      };
      break;
    case 'server':
      userAction = 'Thử lại sau ít phút';
      break;
    case 'timeout':
      userAction = 'Thử lại với kết nối tốt hơn';
      break;
  }

  return {
    shouldRetry,
    retryDelay,
    maxRetries,
    fallbackData,
    userAction,
  };
}

// Dashboard specific error messages
export const DASHBOARD_ERROR_MESSAGES = {
  OVERVIEW_LOAD_FAILED: 'Không thể tải dữ liệu tổng quan dashboard',
  STATS_LOAD_FAILED: 'Không thể tải thống kê',
  CHART_LOAD_FAILED: 'Không thể tải dữ liệu biểu đồ',
  TABLE_LOAD_FAILED: 'Không thể tải dữ liệu bảng',
  WIDGET_LOAD_FAILED: 'Widget tạm thời không khả dụng',
} as const;

// Track error frequency for health monitoring
class ErrorTracker {
  private errors: DashboardError[] = [];
  private readonly maxErrors = 50;

  addError(error: DashboardError) {
    this.errors.push(error);

    // Keep only recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }
  }

  getRecentErrors(minutes: number = 5): DashboardError[] {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return this.errors.filter((error) => error.timestamp > cutoff);
  }

  isSystemUnhealthy(): boolean {
    const recentErrors = this.getRecentErrors(5);
    const databaseErrors = recentErrors.filter((e) => e.type === 'database').length;

    // System is unhealthy if we have 3+ database errors in 5 minutes
    return databaseErrors >= 3;
  }

  getErrorStats() {
    const recent = this.getRecentErrors(10);
    const byType = recent.reduce(
      (acc, error) => {
        acc[error.type] = (acc[error.type] || 0) + 1;
        return acc;
      },
      {} as Record<DashboardErrorType, number>
    );

    return {
      total: recent.length,
      byType,
      isUnhealthy: this.isSystemUnhealthy(),
    };
  }

  clear() {
    this.errors = [];
  }
}

export const dashboardErrorTracker = new ErrorTracker();
