import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import api from '@/lib/api';

// Types
export type QuotaStatusResponse = {
  userId: string;
  camera_quota: number;
  camera_quota_used: number;
  retention_days?: number;
  caregiver_seats?: number;
  sites?: number;
  max_storage_gb?: number;
  updated_at?: string;
};

export type QuotaUsageRealtimeResponse = {
  userId: string;
  camera_usage: number;
  storage_usage_gb: number;
  timestamp: string;
};

export type QuotaUsageHistoryItem = {
  userId: string;
  date: string;
  camera_usage: number;
  storage_usage_gb: number;
};

export type CheckEntitlementRequest = {
  user_id: string | number;
  resource: string;
  amount?: number;
};

export type CheckEntitlementResponse = { allowed: boolean; reason?: string };

// Public quota endpoints
export function getQuotaStatus(userId: string | number) {
  return api.get<QuotaStatusResponse>(`/quota/status/${userId}`);
}

export function checkEntitlement(body: CheckEntitlementRequest) {
  return api.post<CheckEntitlementResponse>('/quota/check-entitlement', body);
}

export function getRealtimeUsage(userId: string | number) {
  return api.get<QuotaUsageRealtimeResponse>(`/quota/usage/realtime/${userId}`);
}

export function getUsageHistory(params?: {
  user_id?: string | number;
  page?: number;
  limit?: number;
}) {
  return api.get<{
    items: QuotaUsageHistoryItem[];
    pagination?: { page: number; limit: number; total: number };
  }>('/quota/usage/history', params);
}

export function checkSoftCap(body: {
  user_id: string | number;
  resource: string;
  amount?: number;
}) {
  return api.post<{ softCapExceeded: boolean; message?: string }>('/quota/check-soft-cap', body);
}

export function checkGracePeriod(body: { user_id: string | number; resource: string }) {
  return api.post<{ inGracePeriod: boolean; expiresAt?: string }>(
    '/quota/check-grace-period',
    body
  );
}

export function enforceHardCap(body: { user_id: string | number; resource: string }) {
  return api.post<{ enforced: boolean; message?: string }>('/quota/enforce-hard-cap', body);
}

export function listQuotas(params?: { page?: number; limit?: number }) {
  return api.get('/quota', params);
}

// Admin endpoints for managing user quota
export function getAdminUserQuota(userId: string | number) {
  return api.get<QuotaStatusResponse>(`/admin/users/${userId}/quota`);
}

export function updateAdminUserQuota(userId: string | number, body: Partial<QuotaStatusResponse>) {
  return api.put<{ updated: boolean }>(`/admin/users/${userId}/quota`, body);
}

export function deleteAdminUserQuota(userId: string | number) {
  return api.delete<{ deleted: boolean }>(`/admin/users/${userId}/quota`);
}

// React Query hooks
export function useQuotaStatus(userId: string | number, enabled = true) {
  return useQuery({
    queryKey: ['quota-status', userId],
    queryFn: () => getQuotaStatus(userId),
    enabled: Boolean(userId) && enabled,
    staleTime: 60_000,
  });
}

export function useCheckEntitlement() {
  return useMutation({ mutationFn: (body: CheckEntitlementRequest) => checkEntitlement(body) });
}

export function useRealtimeUsage(userId: string | number, enabled = true) {
  return useQuery({
    queryKey: ['quota-realtime', userId],
    queryFn: () => getRealtimeUsage(userId),
    enabled: Boolean(userId) && enabled,
    staleTime: 5_000,
  });
}

export function useUsageHistory(
  params?: { user_id?: string | number; page?: number; limit?: number },
  enabled = true
) {
  return useQuery({
    queryKey: ['quota-usage-history', params],
    queryFn: () => getUsageHistory(params),
    enabled,
    staleTime: 60_000,
  });
}

export function useCheckSoftCap() {
  return useMutation({
    mutationFn: (body: { user_id: string | number; resource: string; amount?: number }) =>
      checkSoftCap(body),
  });
}

export function useCheckGracePeriod() {
  return useMutation({
    mutationFn: (body: { user_id: string | number; resource: string }) => checkGracePeriod(body),
  });
}

export function useEnforceHardCap() {
  return useMutation({
    mutationFn: (body: { user_id: string | number; resource: string }) => enforceHardCap(body),
  });
}

export function useQuotas(params?: { page?: number; limit?: number }, enabled = true) {
  return useQuery({
    queryKey: ['quotas', params],
    queryFn: () => listQuotas(params),
    enabled,
    staleTime: 60_000,
  });
}

export function useAdminUserQuota(userId: string | number, enabled = true) {
  return useQuery({
    queryKey: ['admin-user-quota', userId],
    queryFn: () => getAdminUserQuota(userId),
    enabled: Boolean(userId) && enabled,
    staleTime: 60_000,
  });
}

export function useUpdateAdminUserQuota() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { userId: string | number; body: Partial<QuotaStatusResponse> }) =>
      updateAdminUserQuota(params.userId, params.body),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['admin-user-quota', vars.userId] });
      qc.invalidateQueries({ queryKey: ['user-quota', vars.userId] });
    },
  });
}

export function useDeleteAdminUserQuota() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string | number) => deleteAdminUserQuota(userId),
    onSuccess: (_data, userId) => qc.invalidateQueries({ queryKey: ['admin-user-quota', userId] }),
  });
}
