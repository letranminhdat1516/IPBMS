import { z } from 'zod';

// 34. notification_types
export interface NotificationType {
  notification_type_id: number;
  type_name: string;
  description: string;
}
export const NotificationTypeSchema = z.object({
  notification_type_id: z.number(),
  type_name: z.string(),
  description: z.string(),
});

// 35. notifications
export interface Notification {
  notification_id: string;
  user_id: string;
  event_id: string;
  severity: string;
  title?: string;
  message: string;
  delivery_data?: {
    title?: string;
    eventId?: string;
    proposed_status?: string;
    proposed_event_type?: string;
  };
  status: string;
  sent_at?: string;
  delivered_at?: string;
  retry_count: number;
  error_message?: string;
  read_at?: string;
  acknowledged_by?: string;
  acknowledged_at?: string;
  created_at: string;
  resolved_at?: string;
  channel: string;
  business_type: string;
}

export const NotificationSchema = z.object({
  notification_id: z.string(),
  user_id: z.string(),
  event_id: z.string(),
  severity: z.string(),
  title: z.string().optional(),
  message: z.string(),
  delivery_data: z
    .object({
      title: z.string().optional(),
      eventId: z.string().optional(),
      proposed_status: z.string().optional(),
      proposed_event_type: z.string().optional(),
    })
    .optional(),
  status: z.string(),
  sent_at: z.string().optional(),
  delivered_at: z.string().optional(),
  retry_count: z.number(),
  error_message: z.string().optional(),
  read_at: z.string().optional(),
  acknowledged_by: z.string().optional(),
  acknowledged_at: z.string().optional(),
  created_at: z.string(),
  resolved_at: z.string().optional(),
  channel: z.string(),
  business_type: z.string(),
});

// 36. notification_logs
export interface NotificationLog {
  log_id: number;
  notification_id: number;
  log_time: string;
  details: string;
}
export const NotificationLogSchema = z.object({
  log_id: z.number(),
  notification_id: z.number(),
  log_time: z.string(),
  details: z.string(),
});
