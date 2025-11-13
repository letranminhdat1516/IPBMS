import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import api from '@/lib/api';

import type { Alert, AlertType } from '@/types/alert';

export type AlertData = {
  confidence?: number;
  bounding_boxes?: Array<{
    x: number;
    y: number;
    class: string;
    width: number;
    height: number;
    confidence: number;
  }>;
  detection_type?: string;
};

export type AlertItem = {
  alert_id: string;
  event_id: string;
  user_id: string;
  alert_type: string;
  severity: string;
  alert_message: string;
  alert_data?: AlertData;
  status: string;
  acknowledged_by?: string;
  acknowledged_at?: string;
  resolution_notes?: string;
  created_at: string;
  resolved_at?: string;
};

export type AlertsResponse = {
  items: AlertItem[];
  pagination: { page: number; limit: number; total: number };
  summary?: { byStatus?: Record<string, number>; bySeverity?: Record<string, number> };
};

// Also support direct array response
export type AlertsArrayResponse = AlertItem[];

// Union type for flexibility
export type AlertsApiResponse = AlertsResponse | AlertsArrayResponse;

// Alerts API
export function getAlerts(params?: {
  page?: number;
  limit?: number;
  status?: string[];
  type?: string[];
  severity?: string[];
  from?: string;
  to?: string;
}) {
  const query = params
    ? {
        page: params.page,
        limit: params.limit,
        status: params.status?.join(','),
        type: params.type?.join(','),
        severity: params.severity?.join(','),
        from: params.from,
        to: params.to,
      }
    : undefined;
  return api.get<AlertsApiResponse>('/alerts', query);
}

export function useAlerts(params?: {
  page?: number;
  limit?: number;
  status?: string[];
  type?: string[];
  severity?: string[];
  from?: string;
  to?: string;
}) {
  return useQuery({
    queryKey: ['alerts', params],
    queryFn: () => getAlerts(params),
  });
}

export function getAlertById(alertId: number) {
  return api.get<Alert>(`/alerts/${alertId}`);
}

export function useAlertById(alertId: number, enabled = true) {
  return useQuery({
    queryKey: ['alert', alertId],
    queryFn: () => getAlertById(alertId),
    enabled: Boolean(alertId) && enabled,
  });
}

// Alert Types
export function getAlertTypes() {
  return api.get<AlertType[]>('/alert-types');
}

export function useAlertTypes() {
  return useQuery({
    queryKey: ['alert-types'],
    queryFn: () => getAlertTypes(),
  });
}

// Cập nhật trạng thái cảnh báo
export function updateAlertStatus(alertId: number, status: string, userId?: string) {
  return api.patch<{ updated: boolean }>(`/alerts/${alertId}/status`, {
    status,
    user_id: userId,
  });
}

export function acknowledgeAlert(alertId: number, userId: string) {
  return api.patch<{ updated: boolean }>(`/alerts/${alertId}/acknowledge`, {
    user_id: userId,
  });
}

export function resolveAlert(alertId: number, userId: string, resolution?: string) {
  return api.patch<{ updated: boolean }>(`/alerts/${alertId}/resolve`, {
    user_id: userId,
    resolution,
  });
}

export function useUpdateAlertStatus(alertId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ status, userId }: { status: string; userId?: string }) =>
      updateAlertStatus(alertId, status, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alerts'] });
      qc.invalidateQueries({ queryKey: ['alert', alertId] });
    },
  });
}

export function useAcknowledgeAlert(alertId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => acknowledgeAlert(alertId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alerts'] });
      qc.invalidateQueries({ queryKey: ['alert', alertId] });
    },
  });
}

export function useResolveAlert(alertId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, resolution }: { userId: string; resolution?: string }) =>
      resolveAlert(alertId, userId, resolution),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alerts'] });
      qc.invalidateQueries({ queryKey: ['alert', alertId] });
    },
  });
}

// Alert Summary/Dashboard
export function getAlertsSummary(userId: string, params?: { from?: string; to?: string }) {
  return api.get<{
    total: number;
    pending: number;
    acknowledged: number;
    resolved: number;
    critical: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
  }>(`/alerts/summary/${userId}`, params);
}

export function useAlertsSummary(userId: string, params?: { from?: string; to?: string }) {
  return useQuery({
    queryKey: ['alerts-summary', userId, params],
    queryFn: () => getAlertsSummary(userId, params),
    enabled: !!userId,
  });
}
