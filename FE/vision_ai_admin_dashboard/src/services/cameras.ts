import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import api from '@/lib/api';

import { Camera, CameraSchema } from '@/types/camera';

export type CamerasResponse = {
  items: Camera[];
  pagination: { page: number; limit: number; total: number };
};

export function getCameras(params?: {
  page?: number;
  limit?: number;
  q?: string;
  reportedOnly?: boolean;
}) {
  return api.get<CamerasResponse>('/cameras', params);
}

export function useCameras(params?: {
  page?: number;
  limit?: number;
  q?: string;
  reportedOnly?: boolean;
}) {
  return useQuery({
    queryKey: ['cameras', params],
    queryFn: async () => {
      const res = await getCameras(params);
      const maybeArr = res as unknown as Camera[] | CamerasResponse;
      if (Array.isArray(maybeArr)) {
        const data = maybeArr.map((c) => CameraSchema.parse(c));
        return { items: data, pagination: { page: 1, limit: data.length, total: data.length } };
      }
      return res;
    },
  });
}

export function updateCamera(id: string | number, data: Partial<Camera>) {
  return api.put<Camera>(`/cameras/${id}`, data);
}

// Camera events (history)
export type CameraEvent = {
  event_id: number | string;
  camera_id: number | string;
  event_type: string;
  event_time: string; // ISO
  details?: string;
};
export type CameraEventsResponse = {
  items: CameraEvent[];
  pagination: { page: number; limit: number; total: number };
};

export function getCameraEvents(
  id: string | number,
  params?: { page?: number; limit?: number; dateFrom?: string; dateTo?: string; type?: string[] }
) {
  const query = params
    ? {
        page: params.page,
        limit: params.limit,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
        type: params.type?.join(','),
      }
    : undefined;
  return api.get<CameraEventsResponse>(`/cameras/${id}/events`, query);
}

export function useCameraEvents(
  id: string | number,
  params?: { page?: number; limit?: number; dateFrom?: string; dateTo?: string; type?: string[] }
) {
  return useQuery({
    queryKey: ['camera-events', id, params],
    queryFn: () => getCameraEvents(id, params),
    enabled: Boolean(id),
  });
}

// Delete camera
export function deleteCamera(id: string | number) {
  return api.delete<{ deleted: boolean }>(`/cameras/${id}`);
}

export function useDeleteCamera(id: string | number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => deleteCamera(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cameras'] });
    },
  });
}

export type CameraIssue = {
  issue_id: number;
  camera_id: number;
  reporterType: 'customer' | 'staff';
  reason: string;
  reporterName?: string;
  created_at: string;
  status: 'open' | 'in_progress' | 'resolved' | 'blocked';
};

export type CameraIssuesResponse = {
  items: CameraIssue[];
  pagination: { page: number; limit: number; total: number };
};

export function getCameraIssues(id: string | number, params?: { page?: number; limit?: number }) {
  return api.get<CameraIssuesResponse>(`/cameras/${id}/issues`, params);
}

export function createCameraIssue(
  id: string | number,
  body: { reporterType: 'customer' | 'staff'; reason: string; reporterName?: string }
) {
  return api.post<{ created: boolean }>(`/cameras/${id}/issues`, body);
}

export function updateCameraIssue(
  id: string | number,
  issueId: string | number,
  body: { status: 'open' | 'in_progress' | 'resolved' | 'blocked' }
) {
  return api.patch<{ updated: boolean }>(`/cameras/${id}/issues/${issueId}`, body);
}

// Admin functions for camera setup
export type CreateCameraRequest = {
  name: string;
  location: string;
  model: string;
};

export function createCamera(body: CreateCameraRequest) {
  return api.post<Camera>('/cameras', body);
}

export function useCreateCamera() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateCameraRequest) => createCamera(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cameras'] });
    },
  });
}

export function getCamerasByUser(userId: string) {
  return api.get<Camera[]>(`/cameras/by-user/${userId}`);
}

export function useCamerasByUser(userId: string) {
  return useQuery({
    queryKey: ['cameras', 'by-user', userId],
    queryFn: () => getCamerasByUser(userId),
    enabled: Boolean(userId),
  });
}

// Camera settings
export type CameraSettings = {
  resolution?: string;
  fps?: number;
  motion_detection?: boolean;
  night_vision?: boolean;
  rotation_angle?: number;
};

export function updateCameraSettings(cameraId: string, settings: CameraSettings) {
  return api.put<{ updated: boolean }>(`/camera-settings/${cameraId}`, settings);
}

export function useUpdateCameraSettings(cameraId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (settings: CameraSettings) => updateCameraSettings(cameraId, settings),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cameras'] });
    },
  });
}
