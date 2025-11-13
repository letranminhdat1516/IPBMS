import { z } from 'zod';

// 43. maintenance_schedules
export interface MaintenanceSchedule {
  schedule_id: number;
  device_id: number;
  scheduled_date: string;
  completed_date: string;
  status: string;
}

export const MaintenanceScheduleSchema = z.object({
  schedule_id: z.number(),
  device_id: z.number(),
  scheduled_date: z.string(),
  completed_date: z.string(),
  status: z.string(),
});

// 44. maintenance_logs
export interface MaintenanceLog {
  log_id: number;
  schedule_id: number;
  log_time: string;
  details: string;
}

export const MaintenanceLogSchema = z.object({
  log_id: z.number(),
  schedule_id: z.number(),
  log_time: z.string(),
  details: z.string(),
});
