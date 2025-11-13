import { z } from 'zod';

// 23. device_types
export interface DeviceType {
  device_type_id: number;
  type_name: string;
  description: string;
}
export const DeviceTypeSchema = z.object({
  device_type_id: z.number(),
  type_name: z.string(),
  description: z.string(),
});

// 24. devices
export interface Device {
  device_id: number;
  device_type_id: number;
  serial_number: string;
  location: string;
  status: string;
}
export const DeviceSchema = z.object({
  device_id: z.number(),
  device_type_id: z.number(),
  serial_number: z.string(),
  location: z.string(),
  status: z.string(),
});

// 25. device_assignments
export interface DeviceAssignment {
  assignment_id: number;
  device_id: number;
  patient_id: number;
  assigned_date: string;
  returned_date: string;
  status: string;
}
export const DeviceAssignmentSchema = z.object({
  assignment_id: z.number(),
  device_id: z.number(),
  patient_id: z.number(),
  assigned_date: z.string(),
  returned_date: z.string(),
  status: z.string(),
});

// 26. device_data_logs
export interface DeviceDataLog {
  log_id: number;
  device_id: number;
  log_time: string;
  data: string;
}
export const DeviceDataLogSchema = z.object({
  log_id: z.number(),
  device_id: z.number(),
  log_time: z.string(),
  data: z.string(),
});

// 27. device_alerts
export interface DeviceAlert {
  alert_id: number;
  device_id: number;
  alert_type: string;
  alert_time: string;
  status: string;
}
export const DeviceAlertSchema = z.object({
  alert_id: z.number(),
  device_id: z.number(),
  alert_type: z.string(),
  alert_time: z.string(),
  status: z.string(),
});
