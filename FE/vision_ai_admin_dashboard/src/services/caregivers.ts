import { useQuery } from '@tanstack/react-query';

import api from '@/lib/api';
import { normalizePhoneTo84 } from '@/lib/utils';

import {
  Caregiver,
  CaregiverAnyListSchema,
  CaregiverAnySchema,
  CaregiverListSchema,
  CaregiverSchema,
} from '@/types/user';

import { createCaregiverInvitation, deleteCaregiverInvitationById } from './caregiver-invitations';

// Tạo caregiver mới
export function createCaregiver(body: {
  username: string;
  email: string;
  phone?: string;
  pin: string;
  full_name: string;
  role?: string;
}) {
  return api.post<Caregiver>('/caregivers', {
    ...body,
    phone: body.phone ? normalizePhoneTo84(body.phone) : undefined,
  });
}

// Cập nhật caregiver
export function updateCaregiver(
  id: string | number,
  body: Partial<Caregiver> & { pin?: string; phone?: string }
) {
  return api.put<Caregiver>(`/caregivers/${id}`, {
    ...body,
    phone: body.phone ? normalizePhoneTo84(body.phone) : undefined,
  });
}

// Xóa caregiver
export function deleteCaregiver(id: string | number, soft = false) {
  const url = soft ? `/caregivers/${id}/soft` : `/caregivers/${id}`;
  return api.delete<{ deleted: boolean }>(url);
}

// Tìm kiếm caregivers
export function searchCaregivers(params: {
  keyword: string;
  page?: number;
  limit?: number;
  order?: Record<string, 'ASC' | 'DESC'>;
}) {
  const { order, ...rest } = params;
  const query: Record<string, string | number | boolean | undefined> = { ...rest };
  if (order) {
    query.order = Object.entries(order)
      .map(([field, dir]) => `${field}:${dir}`)
      .join(',');
  }
  return api.get<CaregiversResponse>('/caregivers/search', query);
}

// Gán caregiver cho bệnh nhân
export function assignCaregiver(body: {
  caregiver_id: string;
  patient_id: string;
  assignment_notes?: string;
}) {
  return createCaregiverInvitation(body);
}

// Bỏ gán caregiver khỏi bệnh nhân
export function unassignCaregiver(assignment_id: string) {
  return deleteCaregiverInvitationById(assignment_id);
}

export type CaregiversResponse = {
  items: Caregiver[];
  pagination: { page: number; limit: number; total: number };
};

export function getCaregivers(params?: {
  page?: number;
  limit?: number;
  q?: string;
  status?: 'pending' | 'approved' | 'rejected';
}) {
  return api.get<CaregiversResponse>('/caregivers', params);
}

export function useCaregivers(params?: {
  page?: number;
  limit?: number;
  q?: string;
  status?: 'pending' | 'approved' | 'rejected';
}) {
  return useQuery({
    queryKey: ['caregivers', params],
    queryFn: async () => {
      const res = await getCaregivers(params);
      // Accept either an array (possibly user-shaped) or a paginated object
      if (Array.isArray(res)) {
        const anyList = CaregiverAnyListSchema.parse(res);
        // After union, ensure output is normalized to CaregiverSchema shape
        const items = CaregiverListSchema.parse(anyList);
        return { items, pagination: { page: 1, limit: items.length, total: items.length } };
      }
      // paginated response
      const items = Array.isArray(res.items)
        ? CaregiverListSchema.parse(
            // map if backend accidentally returns user-shaped items
            CaregiverAnyListSchema.parse(res.items)
          )
        : [];
      return { items, pagination: res.pagination } satisfies CaregiversResponse;
    },
  });
}

export function getCaregiverById(id: string | number) {
  return api.get<Caregiver>(`/caregivers/${id}`);
}

export function updateCaregiverStatus(
  id: string | number,
  body: { status: 'approved' | 'rejected' }
) {
  return api.patch<{ updated: boolean }>(`/caregivers/${id}/status`, body);
}

export function useCaregiver(id?: string | number) {
  return useQuery({
    queryKey: ['caregiver', id],
    enabled: !!id,
    queryFn: async () => {
      const res = await getCaregiverById(id!);
      // Normalize single item: accept either caregiver-shaped or user-shaped
      const anyItem = CaregiverAnySchema.parse(res as unknown);
      return CaregiverSchema.parse(anyItem) as Caregiver;
    },
  });
}
