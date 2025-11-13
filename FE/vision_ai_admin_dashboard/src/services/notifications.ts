import { useQuery } from '@tanstack/react-query';

import api from '@/lib/api';

import { Notification, NotificationLog, NotificationType } from '@/types/notification';

export type NotificationsResponse = {
  data: Notification[];
  total?: number;
  page?: number;
  limit?: number;
  [k: string]: unknown;
};

export type NotificationFilters = {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
  recipient?: string | number;
};

export function getNotificationTypes() {
  return api.get<NotificationType[]>('/notification-types');
}

export async function getNotifications(params?: NotificationFilters) {
  const res = await api.get<unknown>('/notifications', params);

  // res might be already an array, or an object with data: [] or data: { data: [] }
  const normalize = (raw: unknown): NotificationsResponse => {
    if (!raw) return { data: [] };
    if (Array.isArray(raw)) return { data: raw as Notification[], total: raw.length };
    const o = raw as Record<string, unknown>;
    // Case: { data: [...] , total }
    if (o.data && Array.isArray(o.data)) {
      // If o.data is the array or an inner wrapper
      const inner = o.data as unknown;
      if (Array.isArray(inner)) {
        return {
          data: inner as Notification[],
          total: (o.total as number) ?? inner.length,
          page: (o.page as number) ?? undefined,
          limit: (o.limit as number) ?? undefined,
        };
      }
      // o.data may itself be an object with data: []
      if (typeof inner === 'object' && inner !== null) {
        const innerObj = inner as Record<string, unknown>;
        if (innerObj.data && Array.isArray(innerObj.data)) {
          return {
            data: innerObj.data as Notification[],
            total:
              (innerObj.total as number) ??
              (o.total as number) ??
              (innerObj.data as unknown[]).length,
            page: (innerObj.page as number) ?? (o.page as number) ?? undefined,
            limit: (innerObj.limit as number) ?? (o.limit as number) ?? undefined,
          };
        }
      }
    }
    // Case: { items: [...] }
    if (o.items && Array.isArray(o.items))
      return {
        data: o.items as Notification[],
        total: (o.pagination as { total?: number })?.total ?? (o.items as unknown[]).length,
      };

    // Unknown shape: try to coerce
    return { data: [], total: 0 };
  };

  return normalize(res);
}

export function useNotifications(params?: NotificationFilters) {
  return useQuery({
    queryKey: ['notifications', params],
    queryFn: async () => {
      const response = await getNotifications(params);
      return response;
    },
  });
}

export function sendNotification(body: {
  type: string;
  recipients: Array<{ id: number; type: 'user' | 'caregiver' | 'staff' | 'group' }>;
  message: string;
  channels?: string[];
}) {
  return api.post<{ sent: boolean }>('/notifications/send', body);
}

export function getNotificationLogs(notificationId: number) {
  return api.get<NotificationLog[]>(`/notifications/${notificationId}/logs`);
}
