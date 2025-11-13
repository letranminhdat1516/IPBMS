import { z } from 'zod';

// 28. alert_types
export interface AlertType {
  alert_type_id: number;
  type_name: string;
  description: string;
}
export const AlertTypeSchema = z.object({
  alert_type_id: z.number(),
  type_name: z.string(),
  description: z.string(),
});

// 29. alerts
export interface Alert {
  alert_id: number;
  alert_type_id: number;
  source_id: number;
  source_type: string;
  alert_time: string;
  status: string;
}
export const AlertSchema = z.object({
  alert_id: z.number(),
  alert_type_id: z.number(),
  source_id: z.number(),
  source_type: z.string(),
  alert_time: z.string(),
  status: z.string(),
});

// 30. alert_logs
export interface AlertLog {
  log_id: number;
  alert_id: number;
  log_time: string;
  details: string;
}
export const AlertLogSchema = z.object({
  log_id: z.number(),
  alert_id: z.number(),
  log_time: z.string(),
  details: z.string(),
});
