import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import api from '@/lib/api';

import { type Device } from '@/types/device';
import { type MaintenanceSchedule } from '@/types/maintenance';
import { type User } from '@/types/user';

// Quota
export type UserQuotaResponse = {
  camera_quota: number;
  retention_days: number;
  caregiver_seats: number;
  sites: number;
  max_storage_gb: number;
  created_at: string;
  updated_at: string;
};

export function getUserQuota(userId: string | number) {
  return api.get<UserQuotaResponse>(`/users/${userId}/quota`);
}

export function useUserQuota(userId: string | number, enabled = true) {
  return useQuery({
    queryKey: ['user-quota', userId],
    queryFn: () => getUserQuota(userId),
    enabled: Boolean(userId) && enabled,
    staleTime: 60_000,
  });
}

export type UserDetailResponse = User & {
  avatar_url?: string;
  address?: string;
  age?: number;
  joined?: string;
  type?: string;
  patient_id?: number;
};

export function getUserById(userId: string | number) {
  return api.get<UserDetailResponse>(`/users/${userId}`);
}

export function useUser(userId: string | number, enabled = true) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: () => getUserById(userId),
    enabled: Boolean(userId) && enabled,
    staleTime: 30_000,
  });
}

// Overview
export type OverviewResponse = {
  cameraActive: string | null;
  monitorTime: string | null;
  alertCount: number;
  aiAccuracy: number | null;
  alertsSummary?: {
    bySeverity?: Record<string, number>;
    byStatus?: Record<string, number>;
    emergencyToday?: number;
    importantToday?: number;
    info7d?: number;
    resolved30d?: number;
  };
};

export function getUserOverview(
  userId: string | number,
  params?: { range?: 'today' | '7d' | '30d' }
) {
  return api.get<OverviewResponse>(`/users/${userId}/overview`, params);
}

export function useUserOverview(
  userId: string | number,
  params?: { range?: 'today' | '7d' | '30d' },
  enabled = true
) {
  return useQuery({
    queryKey: ['user-overview', userId, params],
    queryFn: () => getUserOverview(userId, params),
    enabled: Boolean(userId) && enabled,
    // Server Cache-Control: 60s
    staleTime: 60_000,
  });
}

// Alerts
export type AlertEventItem = {
  event_id: string;
  user_id: string;
  camera_id: string;
  event_type: string; // e.g., fall, convulsion, stagger, visitor, unknown
  status: string; // new | resolved | ...
  detected_at: string; // ISO
  confidence_score: number;
  context_data?: Record<string, unknown> | null;
  snapshot_id?: string | null;
  severity: 'low' | 'medium' | 'high' | 'critical' | string;
};

export type AlertsResponseDto = {
  items: AlertEventItem[];
  pagination: { page: number; limit: number; total: number };
  summary?: { bySeverity?: Record<string, number>; byStatus?: Record<string, number> };
};

export function getUserAlerts(
  userId: string | number,
  params?: {
    severity?: string[];
    status?: string[];
    type?: string[];
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
    includeSummary?: boolean;
    orderBy?: 'detected_at' | 'confidence_score';
    order?: 'ASC' | 'DESC';
  }
) {
  const query: Record<string, string | number | boolean | undefined> = {
    userId,
    dateFrom: params?.dateFrom,
    dateTo: params?.dateTo,
    page: params?.page,
    limit: params?.limit,
    includeSummary: params?.includeSummary,
    severity: params?.severity?.join(','),
    status: params?.status?.join(','),
    type: params?.type?.join(','),
    orderBy: params?.orderBy,
    order: params?.order,
  };
  return api.get<AlertsResponseDto>('/alerts', query);
}

export function useUserAlerts(
  userId: string | number,
  params?: {
    severity?: string[];
    status?: string[];
    type?: string[];
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
    includeSummary?: boolean;
    orderBy?: 'detected_at' | 'confidence_score';
    order?: 'ASC' | 'DESC';
  },
  enabled = true
) {
  return useQuery({
    queryKey: ['user-alerts', userId, params],
    queryFn: () => getUserAlerts(userId, params),
    enabled: Boolean(userId) && enabled,
    staleTime: 15_000,
  });
}

// Monitoring
export type MonitoringSettings = {
  fallDetection: boolean;
  sleepMonitoring: boolean;
  medicationReminders: boolean;
  abnormalDetection: boolean;
  sensitivity: 'low' | 'medium' | 'high';
  maxSitMinutes: number;
  notifyChannels: string[];
};
export type MonitoringAnalytics = {
  normalWalkCount: number;
  sitLieMinutes: number;
  abnormalCount: number;
  emergencyCount: number;
  aiAccuracy?: { fall?: number; activity?: number };
};
export type MonitoringTimelineItem = {
  time: string; // ISO
  activity: string;
  location?: string;
  type: 'normal' | 'emergency' | 'medication';
  duration?: number; // seconds/minutes per BE (optional)
};
export type MonitoringPayload = {
  settings?: MonitoringSettings;
  analytics24h?: MonitoringAnalytics;
  timeline?: MonitoringTimelineItem[];
  date?: string;
};

export function getUserMonitoring(
  userId: string | number,
  params?: { date?: string; include?: string }
) {
  return api.get<MonitoringPayload>(`/users/${userId}/monitoring`, params);
}

export function useUserMonitoring(
  userId: string | number,
  params?: { date?: string; include?: string },
  enabled = true
) {
  return useQuery({
    queryKey: ['user-monitoring', userId, params],
    queryFn: () => getUserMonitoring(userId, params),
    enabled: Boolean(userId) && enabled,
    // Server Cache-Control: 60s
    staleTime: 60_000,
  });
}

export function patchUserMonitoringSettings(
  userId: string | number,
  body: Partial<MonitoringSettings>
) {
  return api.patch<{ updated: boolean }>(`/users/${userId}/monitoring/settings`, body);
}

export function usePatchUserMonitoringSettings(userId: string | number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<MonitoringSettings>) => patchUserMonitoringSettings(userId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-monitoring', userId] });
    },
  });
}

// Services (subscription, devices, maintenance, billing)
export type SubscriptionInfo = {
  name: string;
  contractId: string;
  startDate: string;
  endDate: string;
  remaining: string;
  cameraCount: number;
  features: string[];
};
export type BillingItem = {
  date: string;
  period: string;
  amount: string;
  method: string;
  status: string;
  invoice: string;
};
export type ServicesPayload = {
  subscription?: SubscriptionInfo;
  devices?: Device[];
  maintenance?: MaintenanceSchedule[];
  billing?: { items: BillingItem[]; pagination: { page: number; limit: number; total: number } };
};

export function getUserServices(
  userId: string | number,
  params?: { include?: string; page?: number; limit?: number }
) {
  return api.get<ServicesPayload>(`/users/${userId}/services`, params);
}

export function useUserServices(
  userId: string | number,
  params?: { include?: string; page?: number; limit?: number },
  enabled = true
) {
  return useQuery({
    queryKey: ['user-services', userId, params],
    queryFn: () => getUserServices(userId, params),
    enabled: Boolean(userId) && enabled,
    // Server Cache-Control: 300s
    staleTime: 300_000,
  });
}

// Admin
export type AdminSystemInfo = {
  createdAt: string;
  isActive: boolean;
  lastLogin: string | null;
  lastLoginIp: string | null;
  device: string | null;
};
export type AdminPayload = { system: AdminSystemInfo; activities: unknown[] };

export function getUserAdmin(userId: string | number) {
  return api.get<AdminPayload>(`/users/${userId}/admin`);
}

export function useUserAdmin(userId: string | number, enabled = true) {
  return useQuery({
    queryKey: ['user-admin', userId],
    queryFn: () => getUserAdmin(userId),
    enabled: Boolean(userId) && enabled,
    staleTime: 60_000,
  });
}

// Medical info
export type EmergencyContact = { name: string; relation: string; phone: string };
export type MedicalInfoResponse = {
  patient: { id: string; name: string; dob: string | null } | null;
  record: { conditions: string[]; medications: string[]; history: string[] } | null;
  contacts: EmergencyContactWithId[];
};

export function getUserMedicalInfo(userId: string | number) {
  return api.get<MedicalInfoResponse>(`/patients/${userId}/medical-info`);
}

export function useUserMedicalInfo(userId: string | number, enabled = true) {
  return useQuery({
    queryKey: ['user-medical-info', userId],
    queryFn: () => getUserMedicalInfo(userId),
    enabled: Boolean(userId) && enabled,
    staleTime: 60_000,
  });
}

export function upsertUserMedicalInfo(
  userId: string | number,
  body: Partial<{
    patient: { name?: string; dob?: string | null };
    record: { conditions?: string[]; medications?: string[]; history?: string[] };
  }>
) {
  return api.put<MedicalInfoResponse>(`/patients/${userId}/medical-info`, body);
}

export function useUpsertUserMedicalInfo(userId: string | number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (
      body: Partial<{
        patient: { name?: string; dob?: string | null };
        record: { conditions?: string[]; medications?: string[]; history?: string[] };
      }>
    ) => upsertUserMedicalInfo(userId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-medical-info', userId] });
    },
  });
}

export type EmergencyContactWithId = EmergencyContact & { id?: string };

export function getEmergencyContacts(userId: string | number) {
  return api.get<EmergencyContactWithId[]>(`/users/${userId}/emergency-contacts`);
}

export function createEmergencyContact(userId: string | number, payload: EmergencyContact) {
  return api.post<EmergencyContactWithId>(`/users/${userId}/emergency-contacts`, payload);
}

export function updateEmergencyContact(
  userId: string | number,
  contactId: string,
  payload: Partial<EmergencyContact>
) {
  return api.put<EmergencyContactWithId>(
    `/users/${userId}/emergency-contacts/${encodeURIComponent(contactId)}`,
    payload
  );
}

export function deleteEmergencyContact(userId: string | number, contactId: string) {
  return api.delete<void>(`/users/${userId}/emergency-contacts/${encodeURIComponent(contactId)}`);
}

export function useCreateEmergencyContact(userId: string | number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; relation: string; phone: string }) =>
      createEmergencyContact(userId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-medical-info', userId] });
    },
  });
}

export function useUpdateEmergencyContact(userId: string | number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      contactId: string;
      body: Partial<{ name: string; relation: string; phone: string }>;
    }) => updateEmergencyContact(userId, params.contactId, params.body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-medical-info', userId] });
    },
  });
}

export function useDeleteEmergencyContact(userId: string | number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (contactId: string) => deleteEmergencyContact(userId, contactId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-medical-info', userId] });
    },
  });
}
