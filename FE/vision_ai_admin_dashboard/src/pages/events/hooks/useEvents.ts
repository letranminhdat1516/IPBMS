import { useQuery } from '@tanstack/react-query';

import { getEvents } from '@/services/events';

import { DEFAULT_PAGE_SIZE } from '../constants';

interface UseEventsOptions {
  page: number;
  severityFilter: string;
  statusFilter: string;
  typeFilter: string;
}

export const useEvents = ({ page, severityFilter, statusFilter, typeFilter }: UseEventsOptions) => {
  return useQuery({
    queryKey: ['events', page, severityFilter, statusFilter, typeFilter],
    queryFn: async () => {
      const res = await getEvents({
        page,
        limit: DEFAULT_PAGE_SIZE,
        severity: severityFilter === 'all' ? undefined : [severityFilter],
        status: statusFilter === 'all' ? undefined : [statusFilter],
        type: typeFilter === 'all' ? undefined : [typeFilter],
        orderBy: 'detected_at',
        order: 'DESC',
      });

      // Normalize the response to EventsResponse format
      if (Array.isArray(res)) {
        return {
          items: res,
          pagination: { page: 1, limit: res.length, total: res.length },
        };
      }

      if ('data' in res) {
        // EventsPageDto format
        return {
          items: res.data,
          pagination: { page: res.page, limit: res.limit, total: res.total },
          summary: res.summary,
        };
      }

      // EventsResponse format
      return res;
    },
  });
};
