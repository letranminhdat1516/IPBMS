import api from '@/lib/api';

import { FcmToken, FcmTokenListResponse, FcmTokenStatsResponse } from '@/types/fcm-token';

export async function fetchAdminFcmTokens(params: {
  type?: string;
  userId?: string;
  page?: number;
  limit?: number;
}) {
  return api.get<FcmTokenListResponse>('/fcm/admin/tokens', params);
}

export async function fetchAdminFcmTokenDetail(id: string) {
  return api.get<FcmToken>(`/fcm/admin/tokens/${id}`);
}

export async function updateAdminFcmToken(id: string, data: { type?: string; userId?: string }) {
  return api.put(`/fcm/admin/tokens/${id}`, data);
}

export async function bulkDeleteAdminFcmTokens(data: { userIds?: string[]; type?: string }) {
  return api.post('/fcm/admin/tokens/delete', data);
}

export async function fetchAdminFcmTokenStats() {
  return api.get<FcmTokenStatsResponse>('/fcm/admin/tokens/stats');
}

export async function exportAdminFcmTokens(params: { from: string; to: string }) {
  return api.get<FcmToken[]>('/fcm/admin/tokens/export', params);
}

export async function patchAdminFcmTokenStatus(id: string, active: boolean) {
  return api.patch(`/fcm/admin/tokens/${id}/status`, { active });
}
