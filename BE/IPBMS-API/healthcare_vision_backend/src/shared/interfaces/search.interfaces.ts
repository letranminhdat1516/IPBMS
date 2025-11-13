/**
 * Shared search interfaces used across multiple search services
 */

export interface SearchFilters {
  keyword?: string;
  query?: string;
  type?: 'events' | 'caregivers' | 'invoices' | 'all';
  dateFrom?: string | Date;
  dateTo?: string | Date;
  status?: string | string[];
  confidenceMin?: number;
  confidenceMax?: number;
  eventType?: string;
  userId?: string;
  page?: number;
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  id: string;
  type: 'event' | 'caregiver' | 'invoice';
  title: string;
  description: string;
  status: string;
  date?: Date;
  created_at?: Date;
  confidence?: number;
  metadata: Record<string, any>;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  page?: number;
  limit?: number;
  hasMore?: boolean;
  filters?: SearchFilters;
}

export interface SearchHistory {
  id: string;
  userId: string;
  query: string;
  filters: SearchFilters;
  resultCount: number;
  searchedAt: Date;
}

/**
 * Helper to normalize search filters
 */
export function normalizeSearchFilters(filters: SearchFilters): SearchFilters {
  return {
    ...filters,
    keyword: filters.keyword || filters.query,
    type: filters.type || 'all',
    page: filters.page || 1,
    limit: Math.min(filters.limit || 20, 100),
  };
}
