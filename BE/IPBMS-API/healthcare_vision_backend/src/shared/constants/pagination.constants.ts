/**
 * Pagination-related constants
 */

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  SEARCH_HISTORY_LIMIT: 10,
} as const;

/**
 * Helper function to normalize pagination params
 */
export function normalizePagination(page?: number, limit?: number) {
  const normalizedPage = Math.max(1, page || PAGINATION.DEFAULT_PAGE);
  const normalizedLimit = Math.min(
    PAGINATION.MAX_LIMIT,
    Math.max(1, limit || PAGINATION.DEFAULT_LIMIT),
  );

  return {
    page: normalizedPage,
    limit: normalizedLimit,
    skip: (normalizedPage - 1) * normalizedLimit,
    take: normalizedLimit,
  };
}
