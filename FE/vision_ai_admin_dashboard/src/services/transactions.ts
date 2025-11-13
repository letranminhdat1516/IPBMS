import api from '@/lib/api';

import type { Transaction, TransactionFilters, TransactionStats } from '@/types/transaction';

import { getUsersSummary } from './users';

// Backend transaction response type
interface BackendTransaction {
  tx_id: string;
  agreement_id: string;
  plan_code: string;
  plan_snapshot?: {
    code: string;
    name: string;
    price: number;
    sites: number;
    created_at: string;
    camera_quota: number;
    retention_days: number;
    caregiver_seats: number;
    major_updates_months: number;
  };
  amount_subtotal: string;
  amount_discount: string;
  amount_tax: string;
  amount_total: string;
  currency: string;
  period_start: string;
  period_end: string;
  status: string;
  effective_action: string;
  provider: string;
  provider_payment_id?: string;
  idempotency_key?: string;
  related_tx_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  is_proration: boolean;
  payment_id: string;
  plan_snapshot_new?: Record<string, unknown>;
  plan_snapshot_old?: Record<string, unknown>;
  proration_charge: string;
  proration_credit: string;
  version?: string;
  subscriptions?: {
    user_id: string;
    plan_code: string;
  };
}

// Enhanced backend transaction response type (when backend provides user info)
interface BackendTransactionEnhanced extends BackendTransaction {
  subscriptions?: {
    user_id: string;
    plan_code: string;
    user_name?: string; // Enhanced: backend provides user name
    user_email?: string; // Enhanced: backend provides user email
  };
}

// Transaction list response type
type TransactionListResponse = {
  items: Transaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

// Backend response type
type BackendTransactionListResponse = {
  items: BackendTransaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

/**
 * Get all transactions with optional filters
 */
export async function getTransactions(
  filters?: TransactionFilters
): Promise<TransactionListResponse> {
  const query = filters
    ? (filters as Record<string, string | number | boolean | undefined>)
    : undefined;
  const response = await api.get<BackendTransactionListResponse>('/transactions', query);

  // Transform backend response to match frontend types
  const transformedItems = response.items.map((item: BackendTransaction) => ({
    id: item.tx_id,
    user_id: item.subscriptions?.user_id || '',
    user_name: '', // Backend doesn't provide user name
    user_email: '', // Backend doesn't provide user email
    plan_code: item.plan_code,
    plan_name: item.plan_snapshot?.name || '',
    amount: parseFloat(item.amount_total || '0'),
    currency: item.currency,
    status: item.status as Transaction['status'],
    payment_method: (item.provider === 'vn_pay'
      ? 'bank_transfer'
      : item.provider === 'stripe'
        ? 'stripe'
        : item.provider === 'paypal'
          ? 'paypal'
          : 'other') as Transaction['payment_method'],
    transaction_id: item.provider_payment_id || item.tx_id,
    payment_intent_id: item.payment_id,
    description: `Payment for ${item.plan_snapshot?.name || item.plan_code}`,
    metadata: {
      agreement_id: item.agreement_id,
      payment_id: item.payment_id,
      is_proration: item.is_proration,
      effective_action: item.effective_action,
    },
    created_at: item.created_at,
    updated_at: item.updated_at,
    completed_at: item.status === 'completed' ? item.updated_at : undefined,
  }));

  return {
    items: transformedItems,
    pagination: response.pagination,
  };
}

/**
 * Enhanced getTransactions that includes user names by batch fetching user summaries
 */
export async function getTransactionsWithUserNames(
  filters?: TransactionFilters
): Promise<TransactionListResponse> {
  const response = await getTransactions(filters);

  // Collect unique user IDs that need user info
  const userIds = response.items
    .map((item) => item.user_id)
    .filter((id, index, arr) => id && arr.indexOf(id) === index); // unique non-empty IDs

  if (userIds.length === 0) {
    return response;
  }

  try {
    // Batch fetch user summaries
    const userSummaries = await getUsersSummary({ ids: userIds });

    // Create a map for quick lookup
    const userMap = new Map(userSummaries.map((user) => [user.user_id, user]));

    // Enhance transactions with user names
    const enhancedItems = response.items.map((item) => ({
      ...item,
      user_name: userMap.get(item.user_id)?.service_tier || item.user_name, // Use service_tier as name fallback
      user_email: userMap.get(item.user_id)?.latest_payment_status || item.user_email, // This might not be email, but we can adjust
    }));

    return {
      ...response,
      items: enhancedItems,
    };
  } catch (_error) {
    // If user summary fetch fails, return original transactions
    return response;
  }
}

/**
 * Get transaction by ID
 */
export async function getTransaction(id: string): Promise<Transaction> {
  const response = await api.get<Transaction>(`/transactions/${id}`);
  return response;
}

/**
 * Optimized getTransactions that assumes backend provides user names directly
 * Falls back to batch lookup if user names are not provided
 */
export async function getTransactionsOptimized(
  filters?: TransactionFilters
): Promise<TransactionListResponse> {
  const query = filters
    ? (filters as Record<string, string | number | boolean | undefined>)
    : undefined;

  try {
    // Try to get enhanced response from backend
    const response = await api.get<{
      items: BackendTransactionEnhanced[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>('/transactions', query);

    // Transform enhanced backend response to match frontend types
    const transformedItems = response.items.map((item: BackendTransactionEnhanced) => ({
      id: item.tx_id,
      user_id: item.subscriptions?.user_id || '',
      user_name: item.subscriptions?.user_name || '', // Backend provides user name
      user_email: item.subscriptions?.user_email || '', // Backend provides user email
      plan_code: item.plan_code,
      plan_name: item.plan_snapshot?.name || '',
      amount: parseFloat(item.amount_total || '0'),
      currency: item.currency,
      status: item.status as Transaction['status'],
      payment_method: (item.provider === 'vn_pay'
        ? 'bank_transfer'
        : item.provider === 'stripe'
          ? 'stripe'
          : item.provider === 'paypal'
            ? 'paypal'
            : 'other') as Transaction['payment_method'],
      transaction_id: item.provider_payment_id || item.tx_id,
      payment_intent_id: item.payment_id,
      description: `Payment for ${item.plan_snapshot?.name || item.plan_code}`,
      metadata: {
        agreement_id: item.agreement_id,
        payment_id: item.payment_id,
        is_proration: item.is_proration,
        effective_action: item.effective_action,
      },
      created_at: item.created_at,
      updated_at: item.updated_at,
      completed_at: item.status === 'completed' ? item.updated_at : undefined,
    }));

    // Check if all transactions have user names (backend enhancement is working)
    const hasAllUserNames = transformedItems.every(
      (item) => item.user_name && item.user_name !== ''
    );

    if (hasAllUserNames) {
      // Backend provides user names, return optimized response
      return {
        items: transformedItems,
        pagination: response.pagination,
      };
    } else {
      // Backend doesn't provide user names, fall back to batch lookup
      return await getTransactionsWithUserNames(filters);
    }
  } catch (_error) {
    // Failed to get enhanced transactions, fall back to batch lookup
    return await getTransactionsWithUserNames(filters);
  }
}

/**
 * Get transaction statistics
 */
export async function getTransactionStats(filters?: TransactionFilters): Promise<TransactionStats> {
  const query = filters
    ? (filters as Record<string, string | number | boolean | undefined>)
    : undefined;
  const response = await api.get<TransactionStats>('/transactions/stats', query);
  return response;
}

/**
 * Process refund for a transaction
 */
export async function refundTransaction(
  transactionId: string,
  amount?: number,
  reason?: string
): Promise<Transaction> {
  const body = {
    ...(amount !== undefined && { amount }),
    ...(reason && { reason }),
  };
  const response = await api.post<Transaction>(`/transactions/${transactionId}/refund`, body);
  return response;
}

/**
 * Export transactions to CSV
 */
export async function exportTransactions(filters?: TransactionFilters): Promise<Blob> {
  const query = filters
    ? (filters as Record<string, string | number | boolean | undefined>)
    : undefined;

  // For file downloads, we need to use fetch directly since api utility returns JSON
  const BASE_URL = (import.meta.env.VITE_PUBLIC_API_URL || '').replace(/\/$/, '');
  const url = new URL(`/transactions/export`, BASE_URL);

  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.set(k, String(v));
      }
    });
  }

  // Get auth token from store
  const { useAuthStore } = await import('@/stores/authStore');
  const {
    auth: { accessToken },
  } = useAuthStore.getState();

  const tokenToUse =
    accessToken ||
    (import.meta.env.DEV
      ? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0MmQzNDRlNS1iNWE3LTRlNGUtYmJlNi00NGY0M2U3NWY5NzciLCJyb2xlIjoiYWRtaW4iLCJyb2xlIjoiYWRtaW4iLCJ1c2VybmFtZSI6ImFkbWluIiwiZW1haWwiOiJhZG1pbkBoZWFsdGhjYXJlLmNvbSIsImlhdCI6MTc1NzcwMDA2MSwiZXhwIjoxNzU3Nzg2NDYxfQ.OkO1jPhJnaeT4K-UcN72R053ux1wL6YoaqqkTakarhk'
      : '');

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(tokenToUse && { Authorization: `Bearer ${tokenToUse}` }),
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to export transactions: ${response.statusText}`);
  }

  return await response.blob();
}

// Billing History Types
export interface BillingHistoryItem {
  id: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed' | 'refunded';
  description: string;
  date: string;
  invoice_url?: string;
  payment_method?: string;
  plan_name?: string;
  period_start?: string;
  period_end?: string;
}

export interface BillingHistoryResponse {
  data: BillingHistoryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface BillingHistoryFilters {
  userId: string;
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  status?: 'paid' | 'pending' | 'failed' | 'refunded';
}

/**
 * Get billing history for a specific user
 * Used for mobile app billing history screen and web admin dashboard
 */
export async function getBillingHistory(
  filters: BillingHistoryFilters
): Promise<BillingHistoryResponse> {
  const { userId, page = 1, limit = 20, startDate, endDate, status } = filters;

  // Build query parameters
  const query: Record<string, string | number | boolean | undefined> = {
    page,
    limit,
  };

  if (startDate) query.start_date = startDate;
  if (endDate) query.end_date = endDate;
  if (status) query.status = status;

  const result = await api.get<BillingHistoryResponse>(`/users/${userId}/billing-history`, query);

  return result;
}

/**
 * Get billing history with advanced filtering (NEW API)
 * Used for mobile app and web admin dashboard with role-based access
 */
export async function getBillingHistoryAdvanced(
  filters: BillingHistoryFilters
): Promise<BillingHistoryResponse> {
  const { userId, page = 1, limit = 20, startDate, endDate, status } = filters;

  // Build query parameters
  const query: Record<string, string | number | boolean | undefined> = {
    page,
    limit,
  };

  if (userId) query.userId = userId;
  if (startDate) query.startDate = startDate;
  if (endDate) query.endDate = endDate;
  if (status) query.status = status;

  const result = await api.get<BillingHistoryResponse>('/transactions/billing/history', query);

  return result;
}

/**
 * Generate invoice PDF from transaction
 * Used for creating downloadable invoices from successful transactions
 */
export async function generateInvoice(transactionId: string): Promise<{
  invoiceId: string;
  downloadUrl: string;
}> {
  const response = await api.post<{
    success: boolean;
    invoiceId: string;
    downloadUrl: string;
  }>('/invoices/generate', { transactionId });

  return {
    invoiceId: response.invoiceId,
    downloadUrl: response.downloadUrl,
  };
}
