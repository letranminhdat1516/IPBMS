import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import api from '@/lib/api';

// Types
export type SharedPermission = {
  customer_id: string;
  caregiver_id: string;
  permissions: string[];
  created_at?: string;
  updated_at?: string;
};

export type SharedPermissionsListResponse = {
  items: SharedPermission[];
  pagination?: { page: number; limit: number; total: number };
};

// API wrappers
export function listSharedPermissions(
  customerId: string | number,
  params?: { page?: number; limit?: number }
) {
  return api.get<SharedPermissionsListResponse>(
    `/customers/${customerId}/shared-permissions`,
    params
  );
}

export function getSharedPermissions(customerId: string | number, caregiverId: string | number) {
  return api.get<SharedPermission>(`/customers/${customerId}/shared-permissions/${caregiverId}`);
}

export function updateSharedPermissions(
  customerId: string | number,
  caregiverId: string | number,
  body: { permissions: string[] }
) {
  return api.put<SharedPermission>(
    `/customers/${customerId}/shared-permissions/${caregiverId}`,
    body
  );
}

export function deleteSharedPermissions(customerId: string | number, caregiverId: string | number) {
  return api.delete<{ deleted: boolean }>(
    `/customers/${customerId}/shared-permissions/${caregiverId}`
  );
}

// Caregiver side read
export function getCaregiverSharedPermissions(caregiverId: string | number) {
  return api.get<SharedPermission[]>(`/caregivers/${caregiverId}/shared-permissions`);
}

// React Query hooks
export function useSharedPermissionsList(
  customerId: string | number,
  params?: { page?: number; limit?: number },
  enabled = true
) {
  return useQuery({
    queryKey: ['shared-permissions', customerId, params],
    queryFn: () => listSharedPermissions(customerId, params),
    enabled: Boolean(customerId) && enabled,
    staleTime: 60_000,
  });
}

export function useSharedPermissions(
  customerId: string | number,
  caregiverId: string | number,
  enabled = true
) {
  return useQuery({
    queryKey: ['shared-permissions', customerId, caregiverId],
    queryFn: () => getSharedPermissions(customerId, caregiverId),
    enabled: Boolean(customerId) && Boolean(caregiverId) && enabled,
    staleTime: 60_000,
  });
}

export function useUpdateSharedPermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      customerId: string | number;
      caregiverId: string | number;
      body: { permissions: string[] };
    }) => updateSharedPermissions(params.customerId, params.caregiverId, params.body),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['shared-permissions', vars.customerId] });
      qc.invalidateQueries({ queryKey: ['shared-permissions', vars.customerId, vars.caregiverId] });
    },
  });
}

export function useDeleteSharedPermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { customerId: string | number; caregiverId: string | number }) =>
      deleteSharedPermissions(params.customerId, params.caregiverId),
    onSuccess: (_data, vars) =>
      qc.invalidateQueries({ queryKey: ['shared-permissions', vars.customerId] }),
  });
}

export function useCaregiverSharedPermissions(caregiverId: string | number, enabled = true) {
  return useQuery({
    queryKey: ['caregiver-shared-permissions', caregiverId],
    queryFn: () => getCaregiverSharedPermissions(caregiverId),
    enabled: Boolean(caregiverId) && enabled,
    staleTime: 60_000,
  });
}
