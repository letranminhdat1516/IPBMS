import { z } from 'zod';

// 20. cameras
export interface Camera {
  camera_id: number;
  camera_code: string;
  location: string;
  type: string;
  ip_address: string;
  status: string;
  installed_at?: string;
  description?: string;
  connection?: string;
  event_count?: number;
  reported_issue?: boolean;
  report_count?: number;
  last_report_at?: string;
  // Thông tin ticket báo lỗi
  ticket_count?: number;
  open_tickets?: number;
  resolved_tickets?: number;
  last_ticket_date?: string;
  ticket_status?: string;
}

export const CameraSchema = z.object({
  camera_id: z.number(),
  camera_code: z.string(),
  location: z.string(),
  type: z.string(),
  ip_address: z.string(),
  status: z.string(),
  reported_issue: z.boolean().optional(),
  report_count: z.number().optional(),
  last_report_at: z.string().optional(),
  // Thông tin ticket báo lỗi
  ticket_count: z.number().optional(),
  open_tickets: z.number().optional(),
  resolved_tickets: z.number().optional(),
  last_ticket_date: z.string().optional(),
  ticket_status: z.string().optional(),
});
