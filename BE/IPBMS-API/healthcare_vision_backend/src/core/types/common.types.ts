// Common types used across the application
export type UserRole = 'customer' | 'caregiver' | 'admin';
export type Gender = 'male' | 'female' | 'other';
export type EventType = 'fall' | 'convulsion' | 'stagger' | 'visitor' | 'unknown';
export type EventStatus = 'detected' | 'acknowledged' | 'verified' | 'dismissed';
export type DataType = 'string' | 'number' | 'boolean' | 'json' | 'int' | 'float';

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  timestamp?: string;
}

// Pagination types
export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  timestamp?: string;
}
