import { useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Transaction, TransactionFilters, TransactionStats } from '@/types/transaction';

import {
  generateInvoice,
  getTransactionStats,
  getTransactionsOptimized,
} from '@/services/transactions';

/**
 * Custom hook for managing transaction data and operations
 *
 * @param enabled - Whether to enable the queries (default: true)
 * @returns Object containing transaction data, loading states, and handlers
 */
export function useTransactions(enabled: boolean = true) {
  // State cho bộ lọc
  const [filters, setFilters] = useState<TransactionFilters>({});

  // State cho dialog hoàn tiền
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  /**
   * Query để lấy dữ liệu giao dịch từ API
   * Sử dụng filters làm dependency để tự động refetch khi filters thay đổi
   */
  const transactionsQuery = useQuery({
    queryKey: ['transactions', filters],
    queryFn: async () => {
      const response = await getTransactionsOptimized(filters);
      return {
        transactions: response.items,
        pagination: response.pagination,
      };
    },
    enabled,
  });

  /**
   * Query để lấy thống kê giao dịch
   */
  const statsQuery = useQuery<TransactionStats>({
    queryKey: ['transaction-stats', filters],
    queryFn: () => getTransactionStats(filters),
    enabled,
  });

  // Loading states
  const isLoading = transactionsQuery.isLoading || statsQuery.isLoading;
  const isError = transactionsQuery.isError || statsQuery.isError;
  const error = transactionsQuery.error || statsQuery.error;

  // Data
  const transactions = transactionsQuery.data?.transactions || [];
  const pagination = transactionsQuery.data?.pagination;
  const stats = statsQuery.data;

  /**
   * Handlers
   */
  const handleFiltersChange = (newFilters: TransactionFilters) => {
    setFilters(newFilters);
  };

  const handleRefundDialogOpen = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setRefundDialogOpen(true);
  };

  const handleRefundDialogClose = () => {
    setRefundDialogOpen(false);
    setSelectedTransaction(null);
  };

  return {
    // Data
    transactions,
    pagination,
    stats,

    // State
    filters,
    refundDialogOpen,
    selectedTransaction,

    // Loading states
    isLoading,
    isError,
    error,

    // Handlers
    handleFiltersChange,
    handleRefundDialogOpen,
    handleRefundDialogClose,
    // allow external callers to trigger a refetch of transactions & stats
    refetchAll: async () => {
      await Promise.all([transactionsQuery.refetch(), statsQuery.refetch()]);
    },
  };
}

export function useGenerateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: generateInvoice,
    onSuccess: () => {
      // Invalidate billing history queries to refresh invoice URLs
      queryClient.invalidateQueries({ queryKey: ['billing-history'] });
    },
  });
}
