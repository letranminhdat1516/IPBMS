import api from '@/lib/api';

export interface AuditLog {
  id: string;
  timestamp: string;
  actor_id: string | null;
  actor_name: string;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  resource_name: string | null;
  message: string | null;
  severity: string;
  action_enum: string;
  meta: {
    url: string;
    body: unknown;
    query: unknown;
    method: string;
    params: unknown;
  };
  ip: string;
}

export interface ActivityLogResponse {
  data: AuditLog[];
  total: number;
  page: number;
  limit: number;
}

export function getActivityLogs() {
  return api.get<AuditLog[]>('/activity-logs');
}

export function getActivityLog(id: string) {
  return api.get<AuditLog>(`/activity-logs/${id}`);
}

export function getCaregiverAuditLogs(caregiverId: string | number) {
  return api.get<AuditLog[]>(`/users/${caregiverId}/activity-logs`);
}
