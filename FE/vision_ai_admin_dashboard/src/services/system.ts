import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import api from '@/lib/api';
import { extractSettingValue } from '@/lib/settings-normalize';

import type {
  AIFrequencyConfig,
  ActivityLogItem,
  CameraSetting,
  EmergencyProtocol,
  ImageConfig,
  LogConfig,
  NotificationChannelsConfig,
} from '@/types/system-setting';

export type SystemSetting =
  | CameraSetting
  | ImageConfig
  | NotificationChannelsConfig
  | AIFrequencyConfig
  | LogConfig
  | unknown;

export type SystemInfo = {
  system: {
    platform: string;
    arch: string;
    hostname: string;
    uptime: number;
    loadavg: number[];
    totalmem: number;
    freemem: number;
    cpus: number;
  };
  process: {
    pid: number;
    uptime: number;
    memory: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
      external: number;
      arrayBuffers: number;
    };
    version: string;
    versions: Record<string, string>;
  };
  environment: {
    port: string;
    database_url: string;
    jwt_secret: string;
  };
  timestamp: string;
};

export type FeatureToggle = {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  category: string;
  requiresRestart?: boolean;
};

export type SecuritySettings = {
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    expirationDays: number;
  };
  sessionSettings: {
    maxSessionDuration: number;
    inactivityTimeout: number;
    maxConcurrentSessions: number;
  };
  twoFactorAuth: {
    enabled: boolean;
    required: boolean;
    backupCodes: boolean;
  };
};

export type MaintenanceMode = {
  enabled: boolean;
  message: string;
  allowedIps: string[];
  scheduledStart?: string;
  scheduledEnd?: string;
};

export function getSystemSettings(params?: { keys?: string }) {
  return api.get<Record<string, SystemSetting | null>>('/system/settings', params);
}

export type NormalizedSetting = { value?: unknown; description?: string } | null;

export async function getNormalizedSystemSettings(params?: { keys?: string }) {
  const res = await getSystemSettings(params);
  const out: Record<string, NormalizedSetting> = {};
  for (const k of Object.keys(res || {})) {
    const raw = (res as Record<string, unknown>)[k];
    if (raw === null || raw === undefined) {
      out[k] = null;
      continue;
    }
    const extracted = extractSettingValue(raw);
    out[k] = { value: extracted.value, description: extracted.description };
  }
  return out;
}

export function useSystemSettings(params?: { keys?: string }) {
  return useQuery({
    queryKey: ['system-settings', params],
    queryFn: async () => {
      const res = await getSystemSettings(params);
      return res as Record<string, SystemSetting | null>;
    },
  });
}

export function useNormalizedSystemSettings(params?: { keys?: string }) {
  return useQuery({
    queryKey: ['system-settings-normalized', params],
    queryFn: async () => {
      const res = await getNormalizedSystemSettings(params);
      return res as Record<string, NormalizedSetting>;
    },
  });
}

export function getSystemSetting(key: string) {
  return api.get<{ key: string; value: SystemSetting; updated_at?: string }>(
    `/system/settings/${encodeURIComponent(key)}`
  );
}

export function useSystemSetting(key?: string) {
  return useQuery({
    queryKey: ['system-setting', key],
    enabled: !!key,
    queryFn: async () => {
      const res = await getSystemSetting(key!);
      return res;
    },
  });
}

export function usePutSystemSetting(key: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { value: unknown; description?: string }) => putSystemSetting(key, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['system-settings'] });
      qc.invalidateQueries({ queryKey: ['system-setting', key] });
    },
  });
}

export function putSystemSetting(key: string, body: { value: unknown; description?: string }) {
  // API accepts either { value } or raw primitive/object. Prefer raw when no description is present.
  const payload =
    Object.prototype.hasOwnProperty.call(body, 'description') && body.description !== undefined
      ? body
      : (body?.value as unknown);
  return api.put<{ key: string; value: unknown; updated_at: string }>(
    `/system/settings/${encodeURIComponent(key)}`,
    payload
  );
}

export function getEmergencyProtocols() {
  return api.get<EmergencyProtocol[]>('/system/emergency-protocols');
}
export function saveEmergencyProtocols(body: EmergencyProtocol[]) {
  return api.post<EmergencyProtocol[]>('/system/emergency-protocols', body);
}

export function useEmergencyProtocols() {
  return useQuery({
    queryKey: ['system-emergency-protocols'],
    queryFn: async () => {
      const res = await getEmergencyProtocols();
      return res as EmergencyProtocol[];
    },
  });
}

export function useSaveEmergencyProtocols() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: EmergencyProtocol[]) => saveEmergencyProtocols(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['system-emergency-protocols'] }),
  });
}

// Activity logs
export function listActivityLogs(params?: Record<string, unknown>) {
  return api.get<{
    items: ActivityLogItem[];
    pagination: { page: number; per_page: number; total: number };
  }>(
    '/system/activity-logs',
    params as unknown as Record<string, string | number | boolean | undefined>
  );
}

export function useActivityLogs(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['system-activity-logs', params],
    queryFn: async () => {
      const res = await listActivityLogs(params);
      return res;
    },
  });
}

export function getActivityLog(id: string) {
  return api.get<ActivityLogItem>(`/system/activity-logs/${encodeURIComponent(id)}`);
}

export function useActivityLog(id?: string) {
  return useQuery({
    queryKey: ['system-activity-log', id],
    enabled: !!id,
    queryFn: async () => {
      const res = await getActivityLog(id!);
      return res;
    },
  });
}

export function useDeleteActivityLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteActivityLog(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['system-activity-logs'] }),
  });
}

export function useDeleteActivityLogsByFilter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { before?: string; severity?: string[]; actor_id?: string }) =>
      deleteActivityLogsByFilter(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['system-activity-logs'] }),
  });
}

export function deleteActivityLog(id: string) {
  return api.delete<void>(`/system/activity-logs/${encodeURIComponent(id)}`);
}

export function exportActivityLogs(params?: Record<string, unknown>) {
  return api.get<{ url: string }>(
    '/system/activity-logs/export',
    params as unknown as Record<string, string | number | boolean | undefined>
  );
}

export function useExportActivityLogs() {
  return useMutation({
    mutationFn: (params?: Record<string, unknown>) => exportActivityLogs(params),
  });
}

export function deleteActivityLogsByFilter(body: {
  before?: string;
  severity?: string[];
  actor_id?: string;
}) {
  return api.post<{ deleted: number }>(
    '/system/activity-logs/delete-by-filter',
    // Backend expects { before?: ISO, severity?: string[], actor_id?: string, confirm?: boolean }
    { ...body, confirm: true }
  );
}

// Notifications test
export function testNotification(body: {
  to: string;
  providers?: 'sms' | 'call' | 'both';
  message?: string;
  template?: string;
  params?: Record<string, unknown>;
}) {
  return api.post<{
    sent: boolean;
    details: { sms?: { success: boolean; id?: string }; call?: { success: boolean; id?: string } };
  }>('/system/notifications/test', body);
}

export function useTestNotification() {
  return useMutation({
    mutationFn: (body: {
      to: string;
      providers?: 'sms' | 'call' | 'both';
      message?: string;
      template?: string;
      params?: Record<string, unknown>;
    }) => testNotification(body),
  });
}

// Hooks for AI frequency and notification channels
export function useAIFrequency() {
  return useSystemSetting('ai_frequency');
}

export function useNotificationChannels() {
  return useSystemSetting('notification_channels');
}

// AI frequency
export function getAIFrequency() {
  return getSystemSetting('ai_frequency');
}

export function putAIFrequency(body: { value: AIFrequencyConfig }) {
  return putSystemSetting('ai_frequency', body);
}

// Notification channels helpers
export function getNotificationChannels() {
  return getSystemSetting('notification_channels');
}

export function putNotificationChannels(body: { value: NotificationChannelsConfig }) {
  return putSystemSetting('notification_channels', body);
}

// System Info and Health
export function getSystemInfo() {
  return api.get<SystemInfo>('/system/info');
}

export function useSystemInfo() {
  return useQuery({
    queryKey: ['system-info'],
    queryFn: getSystemInfo,
    refetchInterval: 30_000, // Refresh every 30 seconds
  });
}

// Feature Toggles
export function getFeatureToggles() {
  return api.get<FeatureToggle[]>('/system/features');
}

export function updateFeatureToggle(key: string, enabled: boolean) {
  return api.put<FeatureToggle>(`/system/features/${encodeURIComponent(key)}`, { enabled });
}

export function useFeatureToggles() {
  return useQuery({
    queryKey: ['feature-toggles'],
    queryFn: getFeatureToggles,
  });
}

export function useUpdateFeatureToggle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, enabled }: { key: string; enabled: boolean }) =>
      updateFeatureToggle(key, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-toggles'] });
    },
  });
}

// Security Settings
export function getSecuritySettings() {
  return api.get<SecuritySettings>('/system/security');
}

export function updateSecuritySettings(settings: Partial<SecuritySettings>) {
  return api.put<SecuritySettings>('/system/security', settings);
}

export function useSecuritySettings() {
  return useQuery({
    queryKey: ['security-settings'],
    queryFn: getSecuritySettings,
  });
}

export function useUpdateSecuritySettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateSecuritySettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-settings'] });
    },
  });
}

// Maintenance Mode
export function getMaintenanceMode() {
  return api.get<MaintenanceMode>('/system/maintenance');
}

export function updateMaintenanceMode(mode: Partial<MaintenanceMode>) {
  return api.put<MaintenanceMode>('/system/maintenance', mode);
}

export function useMaintenanceMode() {
  return useQuery({
    queryKey: ['maintenance-mode'],
    queryFn: getMaintenanceMode,
  });
}

export function useUpdateMaintenanceMode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateMaintenanceMode,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-mode'] });
    },
  });
}

// System Actions
export function restartSystem() {
  return api.post('/system/restart');
}

export function clearCache() {
  return api.post('/system/cache/clear');
}

export function createBackup() {
  return api.post('/system/backup');
}

export function useSystemActions() {
  const queryClient = useQueryClient();

  const restartMutation = useMutation({
    mutationFn: restartSystem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-info'] });
    },
  });

  const clearCacheMutation = useMutation({
    mutationFn: clearCache,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-info'] });
    },
  });

  const createBackupMutation = useMutation({
    mutationFn: createBackup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-info'] });
    },
  });

  return {
    restart: restartMutation,
    clearCache: clearCacheMutation,
    createBackup: createBackupMutation,
  };
}
