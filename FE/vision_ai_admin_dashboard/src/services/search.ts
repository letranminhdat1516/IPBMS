import { useMutation, useQuery } from '@tanstack/react-query';

import api from '@/lib/api';

export type UnifiedSearchRequest = {
  q: string;
  types?: string[];
  page?: number;
  limit?: number;
  filters?: Record<string, unknown>;
};

export type UnifiedSearchResultItem = {
  id: string;
  type: string;
  score?: number;
  highlight?: Record<string, string>;
  payload?: unknown;
};

export type UnifiedSearchResponse = {
  items: UnifiedSearchResultItem[];
  total: number;
  page: number;
  limit: number;
};

export type QuickActionRequest = {
  action: string;
  target_id?: string;
  payload?: Record<string, unknown>;
};

export function unifiedSearch(body: UnifiedSearchRequest) {
  return api.post<UnifiedSearchResponse>('/search', body);
}

export function quickActionSearch(body: QuickActionRequest) {
  return api.post('/search/quick-action', body);
}

export function getSearchHistory(params?: { user_id?: string; limit?: number }) {
  return api.get<{ items: unknown[] }>('/search/history', params);
}

// React Query hooks
export function useUnifiedSearch(body: UnifiedSearchRequest, enabled = true) {
  return useQuery({
    queryKey: ['unified-search', body],
    queryFn: () => unifiedSearch(body),
    enabled: Boolean(enabled && body?.q?.length > 0),
    staleTime: 30_000,
  });
}

export function useQuickActionSearch() {
  return useMutation({ mutationFn: quickActionSearch });
}

export function useSearchHistory(params?: { user_id?: string; limit?: number }) {
  return useQuery({
    queryKey: ['search-history', params],
    queryFn: () => getSearchHistory(params),
    staleTime: 60_000,
  });
}
