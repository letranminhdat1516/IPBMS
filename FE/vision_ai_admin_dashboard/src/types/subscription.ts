import { User } from './user';

export interface Plan {
  code: string;
  name: string;
  price: string;
  camera_quota: number;
  retention_days: number;
  caregiver_seats: number;
  sites: number;
  major_updates_months: number;
  created_at: string;
  storage_size: string;
  is_recommended: boolean;
  tier: number;
  currency: string;
  status: string;
  is_current: null;
  version: null;
  effective_from: null;
  effective_to: null;
}

export interface Subscription {
  subscription_id: string;
  user_id: string;
  plan_code: string;
  plan_id: string | null;
  status: 'active' | 'inactive' | 'cancelled' | 'expired' | string;
  billing_period: string;
  started_at: string;
  current_period_start: string;
  current_period_end: string | null;
  trial_end_at: string | null;
  canceled_at: string | null;
  ended_at: string | null;
  auto_renew: boolean;
  cancel_at_period_end: boolean;
  extra_camera_quota: number;
  extra_caregiver_seats: number;
  extra_sites: number;
  extra_storage_gb: number;
  notes: string | null;
  last_payment_at: string | null;
  version: null;
  plans: Plan | null;
  offer_start_date?: string | null;
  offer_end_date?: string | null;
  renewal_attempt_count?: number;
  next_renew_attempt_at?: string | null;
  dunning_stage?: string | null;
  last_renewal_error?: string | null;
  user?: User;
}

export type SubscriptionsListApiResponse = {
  success: boolean;
  data: Subscription[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages?: number;
  };
  message?: string;
  timestamp?: string;
};

export interface Payment {
  payment_id: string;
  subscription_id: string;
  customer_id: number;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_method: string;
  transaction_id?: string;
  created_at: string;
  updated_at: string;
}
