import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import api from '@/lib/api';

export type EventItem = {
  event_id: string;
  user_id: string;
  camera_id?: string | null;
  event_type: string;
  status?: string;
  detected_at: string; // ISO
  confidence_score?: number;
  severity?: string;
  context_data?: Record<string, unknown> | null;
  snapshot_id?: string | null;
};

export type EventsResponse = {
  items: EventItem[];
  pagination: { page: number; limit: number; total: number };
  summary?: { bySeverity?: Record<string, number>; byStatus?: Record<string, number> };
};

type EventsPageDto = {
  data: EventItem[];
  total: number;
  page: number;
  limit: number;
  summary?: { bySeverity?: Record<string, number>; byStatus?: Record<string, number> };
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}
function isEventsPageDto(v: unknown): v is EventsPageDto {
  return (
    isRecord(v) &&
    Array.isArray(v.data) &&
    typeof v.total === 'number' &&
    typeof v.page === 'number' &&
    typeof v.limit === 'number'
  );
}
function isEventsResponse(v: unknown): v is EventsResponse {
  if (!isRecord(v)) return false;
  const r = v as Record<string, unknown>;
  const items = r['items'];
  const pagination = r['pagination'];
  if (!Array.isArray(items) || !isRecord(pagination)) return false;
  const p = pagination as Record<string, unknown>;
  return (
    typeof p['page'] === 'number' &&
    typeof p['limit'] === 'number' &&
    typeof p['total'] === 'number'
  );
}

export function getRecentEvents(params?: { limit?: number }) {
  return api.get<EventItem[]>('/events', params);
}

export function useRecentEvents(params?: { limit?: number }) {
  return useQuery({
    queryKey: ['events-recent', params],
    queryFn: () => getRecentEvents(params),
    staleTime: 30_000,
  });
}

export function getUserRecentEvents(userId: string | number, params?: { limit?: number }) {
  return api.get<EventItem[]>(`/events/recent/${userId}`, params);
}

export function useUserRecentEvents(userId: string | number, params?: { limit?: number }) {
  return useQuery({
    queryKey: ['events-recent-user', userId, params],
    queryFn: () => getUserRecentEvents(userId, params),
    enabled: Boolean(userId),
    staleTime: 30_000,
  });
}

// Global events (paginated + filters)
export function getEvents(params?: {
  page?: number;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
  severity?: string[];
  status?: string[];
  type?: string[];
  orderBy?: 'detected_at' | 'confidence_score';
  order?: 'ASC' | 'DESC';
}) {
  const query = params
    ? {
        page: params.page,
        limit: params.limit,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
        severity: params.severity?.join(','),
        status: params.status?.join(','),
        type: params.type?.join(','),
        orderBy: params.orderBy,
        order: params.order,
      }
    : undefined;
  return api.get<EventsResponse | EventsPageDto | EventItem[]>('/events', query);
}

export function useEvents(params?: {
  page?: number;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
  severity?: string[];
  status?: string[];
  type?: string[];
  orderBy?: 'detected_at' | 'confidence_score';
  order?: 'ASC' | 'DESC';
}) {
  return useQuery({
    queryKey: ['events', params],
    queryFn: async () => {
      const res = await getEvents(params);
      if (isEventsPageDto(res)) {
        return {
          items: res.data,
          pagination: { page: res.page, limit: res.limit, total: res.total },
          summary: res.summary,
        } satisfies EventsResponse;
      }
      if (isEventsResponse(res)) return res;
      if (Array.isArray(res)) {
        const arr = res as EventItem[];
        return { items: arr, pagination: { page: 1, limit: arr.length, total: arr.length } };
      }
      throw new Error('Invalid events response');
    },
  });
}

// Event detail + status update
export function getEventById(eventId: string | number) {
  return api.get<EventItem>(`/events/${encodeURIComponent(String(eventId))}`);
}

export function useEventById(eventId: string | number, enabled = true) {
  return useQuery({
    queryKey: ['event', eventId],
    queryFn: () => getEventById(eventId),
    enabled: Boolean(eventId) && enabled,
    staleTime: 15_000,
  });
}

export function patchEventStatus(eventId: string | number, body: { status: string }) {
  // Per guide, status can be provided as query param; send both for compatibility
  const qs = new URLSearchParams();
  if (body?.status) qs.set('status', body.status);
  const url = `/events/${encodeURIComponent(String(eventId))}${qs.toString() ? `?${qs.toString()}` : ''}`;
  return api.patch<{ updated: boolean }>(url, body);
}

export function usePatchEventStatus(eventId: string | number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { status: string }) => patchEventStatus(eventId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event', eventId] });
      qc.invalidateQueries({ queryKey: ['events'] });
    },
  });
}
