import { ApiResponse, PaginatedResponse } from '../../core/types/common.types';

/**
 * Create a successful API response
 */
export function createSuccessResponse<T>(data: T, message?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create a paginated API response
 */
export function createPaginatedResponse<T>(
  data: T[],
  pagination: any,
  message?: string,
): PaginatedResponse<T> {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
    pagination,
  };
}

/**
 * Create an error API response
 */
export function createErrorResponse(message: string, code: string = 'ERROR', details?: any) {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Generate random OTP code
 */
export function generateOTP(length: number = 6): string {
  return Math.floor(
    Math.pow(10, length - 1) +
      Math.random() * (Math.pow(10, length) - Math.pow(10, length - 1) - 1),
  ).toString();
}

/**
 * Calculate pagination metadata
 */
export function calculatePagination(total: number, page: number, limit: number) {
  const totalPages = Math.ceil(total / limit);
  return {
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/**
 * Sanitize phone number (remove non-numeric characters except +)
 */
export function sanitizePhoneNumber(phone: string): string {
  return phone.replace(/[^\d+]/g, '');
}

/**
 * Validate E.164 phone format
 */
export function isValidPhoneFormat(phone: string): boolean {
  const e164Regex = /^\+?\d{9,15}$/;
  return e164Regex.test(phone);
}

/**
 * Sanitize order object with a whitelist of allowed fields.
 * Accepts order as Record<string, 'ASC'|'DESC'> or string like "field:DESC,other:ASC".
 */
// Order sanitization helper lives in shared/utils/order.util.ts
