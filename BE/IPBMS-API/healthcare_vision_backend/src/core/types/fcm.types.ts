import {
  AndroidConfig,
  ApnsConfig,
  Notification,
  SendResponse,
  WebpushConfig,
} from 'firebase-admin/messaging';

// FCM Constants, Types & Error Classes
export class FcmConstants {
  static readonly CHUNK_SIZE = 500;
  static readonly DEFAULT_CONCURRENCY = 5;
  static readonly MAX_CONCURRENCY = 10;
  static readonly RETRY_ATTEMPTS = 3;
  static readonly INVALID_TOKEN_RATE_THRESHOLD = 0.05;
  static readonly DEFAULT_TTL_SECONDS = 3600;
  static readonly RETRY_BACKOFF_MS = 200;
  static readonly RETRY_BACKOFF_JITTER_MS = 400;
  static readonly PAGINATION_DEFAULT_PAGE = 1;
  static readonly PAGINATION_DEFAULT_LIMIT = 20;
  static readonly PAGINATION_MAX_LIMIT = 100;
  static readonly PAGINATION_MIN_LIMIT = 1;
}

export type Audience = 'device' | 'caregiver' | 'emergency' | 'customer';
export type TokenType = 'device' | 'caregiver' | 'emergency' | 'customer';

// Custom Error Classes
export class FcmError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryable: boolean = false,
    public details?: any,
  ) {
    super(message);
    this.name = 'FcmError';
  }
}

export class AdminOperationError extends Error {
  constructor(
    message: string,
    public operation: string,
    public code: string,
    public userId?: string,
  ) {
    super(message);
    this.name = 'AdminOperationError';
  }
}

// Audit Log Interface
export interface FcmAuditLog {
  operation: string;
  userId?: string;
  adminUserId?: string;
  details: any;
  timestamp: Date;
  ipAddress?: string;
}

// FCM Payload interfaces
export interface FcmNotificationPayload {
  notification?: Notification;
  data?: Record<string, string>;
  android?: AndroidConfig;
  apns?: ApnsConfig;
  webpush?: WebpushConfig;
}

export interface FcmSendOptions {
  collapseKey?: string;
  ttlSeconds?: number;
  includeResponses?: boolean;
}

export interface FcmMulticastResult {
  successCount: number;
  failureCount: number;
  responses?: SendResponse[];
}
