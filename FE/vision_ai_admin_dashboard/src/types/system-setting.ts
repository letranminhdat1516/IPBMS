import { z } from 'zod';

// ===== Legacy / existing DB shapes (kept for compatibility) =====
export interface SystemSetting {
  setting_id: number;
  key: string;
  // earlier code stored value as string; allow unknown so FE can parse objects
  value: unknown;
  description: string;
}

export const SystemSettingSchema = z.object({
  setting_id: z.number(),
  key: z.string(),
  value: z.unknown(),
  description: z.string(),
});

export interface AuditLog {
  log_id: number;
  user_id: number;
  action: string;
  timestamp: string; // ISO-8601
  details: string;
}
export const AuditLogSchema = z.object({
  log_id: z.number(),
  user_id: z.number(),
  action: z.string(),
  timestamp: z.string(),
  details: z.string(),
});

export interface ErrorLog {
  error_id: number;
  error_time: string;
  error_message: string;
  stack_trace: string;
  user_id: number;
}
export const ErrorLogSchema = z.object({
  error_id: z.number(),
  error_time: z.string(),
  error_message: z.string(),
  stack_trace: z.string(),
  user_id: z.number(),
});

// ===== New/normalized types used by frontend (match OpenAPI spec) =====

export interface CameraSetting {
  enable: boolean;
  count: number; // >= 0
  quality_percent?: number; // 0..100
  quality?: 'low' | 'medium' | 'high';
  note?: string;
}
export const CameraSettingSchema = z.object({
  enable: z.boolean(),
  count: z.number().int().nonnegative(),
  quality_percent: z.number().int().min(0).max(100).optional(),
  quality: z.enum(['low', 'medium', 'high']).optional(),
  note: z.string().optional(),
});

export interface ImageConfig {
  enable: boolean;
  quality: 'low' | 'medium' | 'high';
  retention_days_normal: number;
  retention_days_alert: number;
}
export const ImageConfigSchema = z.object({
  enable: z.boolean(),
  quality: z.enum(['low', 'medium', 'high']),
  retention_days_normal: z.number().int().nonnegative(),
  retention_days_alert: z.number().int().nonnegative(),
});

export interface NotificationChannelsConfig {
  priority: Array<'call' | 'sms' | 'push' | 'email'>;
  enabled: { call: boolean; sms: boolean; push: boolean; email: boolean };
  throttle_seconds?: number;
  channels?: Record<string, unknown>;
}
export const NotificationChannelsConfigSchema = z.object({
  priority: z.array(z.enum(['call', 'sms', 'push', 'email'])),
  enabled: z.object({
    call: z.boolean(),
    sms: z.boolean(),
    push: z.boolean(),
    email: z.boolean(),
  }),
  throttle_seconds: z.number().int().nonnegative().optional(),
  channels: z.record(z.string(), z.unknown()).optional(),
});

export interface AIFrequencyConfig {
  enabled: boolean;
  sensitivity: number; // 0..100
  detection_interval_seconds: number; // >=1
  per_camera_overrides?: Record<string, Partial<Omit<AIFrequencyConfig, 'per_camera_overrides'>>>;
}
export const AIFrequencyConfigSchema = z.object({
  enabled: z.boolean(),
  sensitivity: z.number().int().min(0).max(100),
  detection_interval_seconds: z.number().int().min(1),
  per_camera_overrides: z
    .record(
      z.string(),
      z
        .object({
          enabled: z.boolean().optional(),
          sensitivity: z.number().int().min(0).max(100).optional(),
          detection_interval_seconds: z.number().int().min(1).optional(),
        })
        .partial()
    )
    .optional(),
});

export interface LogConfig {
  retention_days: number;
  storage: 'local' | 's3';
  s3?: { bucket: string; region: string; prefix?: string };
}
export const LogConfigSchema = z.object({
  retention_days: z.number().int().nonnegative(),
  storage: z.enum(['local', 's3']),
  s3: z
    .object({
      bucket: z.string(),
      region: z.string(),
      prefix: z.string().optional(),
    })
    .optional(),
});

// Emergency protocol: FE currently stores steps as stringified JSON; keep that shape
export type EmergencyProtocolStepString = string; // JSON.stringify({type,title,desc})
export interface EmergencyProtocol {
  id: number;
  name: string;
  steps: EmergencyProtocolStepString[];
}
export const EmergencyProtocolSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  steps: z.array(z.string()),
});

// Parsed step object (convenience for FE parsing)
export interface EmergencyProtocolParsedStep {
  type: 'detect' | 'notify' | 'support' | 'other';
  title: string;
  desc: string;
}
export const EmergencyProtocolParsedStepSchema = z.object({
  type: z.enum(['detect', 'notify', 'support', 'other']),
  title: z.string(),
  desc: z.string(),
});

export interface ActivityLogItem {
  id: string;
  timestamp: string; // ISO-8601
  actor?: { id?: string; name?: string };
  action: string;
  resource_type?: string;
  resource_id?: string;
  message?: string;
  severity?: 'info' | 'warning' | 'error';
  meta?: Record<string, unknown>;
  ip?: string;
}
export const ActivityLogItemSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  actor: z.object({ id: z.string().optional(), name: z.string().optional() }).optional(),
  action: z.string(),
  resource_type: z.string().optional(),
  resource_id: z.string().optional(),
  message: z.string().optional(),
  severity: z.enum(['info', 'warning', 'error']).optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
  ip: z.string().optional(),
});

// Convenience union for typed settings values
export type KnownSettingValue =
  | CameraSetting
  | ImageConfig
  | NotificationChannelsConfig
  | AIFrequencyConfig
  | LogConfig
  | EmergencyProtocol[];
