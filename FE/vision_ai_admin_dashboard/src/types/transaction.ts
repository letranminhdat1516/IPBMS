export interface Transaction {
  id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  plan_code: string;
  plan_name?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';
  payment_method: 'stripe' | 'paypal' | 'bank_transfer' | 'credit_card' | 'other';
  transaction_id?: string;
  payment_intent_id?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  refunded_at?: string;
  refund_amount?: number;
  refund_reason?: string;
}

export interface TransactionFilters {
  status?: Transaction['status'];
  payment_method?: Transaction['payment_method'];
  user_id?: string;
  plan_code?: string;
  date_from?: string;
  date_to?: string;
  amount_min?: number;
  amount_max?: number;
}

export interface TransactionStats {
  total_transactions: number;
  total_amount: number;
  successful_transactions: number;
  failed_transactions: number;
  refunded_amount: number;
  average_transaction_amount: number;
  transactions_by_status: Record<Transaction['status'], number>;
  transactions_by_method: Record<Transaction['payment_method'], number>;
}
