import { z } from 'zod';

// 37. report_types
export interface ReportType {
  report_type_id: number;
  type_name: string;
  description: string;
}
export const ReportTypeSchema = z.object({
  report_type_id: z.number(),
  type_name: z.string(),
  description: z.string(),
});

// 38. reports
export interface Report {
  report_id: number;
  report_type_id: number;
  source_id: number;
  source_type: string;
  report_time: string;
  content: string;
  status: string;
}
export const ReportSchema = z.object({
  report_id: z.number(),
  report_type_id: z.number(),
  source_id: z.number(),
  source_type: z.string(),
  report_time: z.string(),
  content: z.string(),
  status: z.string(),
});

// 39. report_logs
export interface ReportLog {
  log_id: number;
  report_id: number;
  log_time: string;
  details: string;
}
export const ReportLogSchema = z.object({
  log_id: z.number(),
  report_id: z.number(),
  log_time: z.string(),
  details: z.string(),
});
