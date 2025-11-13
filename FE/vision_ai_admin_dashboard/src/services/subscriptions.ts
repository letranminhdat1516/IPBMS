import api from '@/lib/api';

import type { Payment, Subscription } from '@/types/subscription';

export type GetSubscriptionsParams = {
  page?: number;
  limit?: number;
  user_id?: string;
  status?: string;
};

export type GetPaymentsParams = {
  page?: number;
  limit?: number;
  subscription_id?: string;
  customer_id?: number;
  status?: string;
};

export function getSubscriptions(params: GetSubscriptionsParams = {}) {
  return api.get<{
    data: Subscription[];
    total: number;
    page: number;
    limit: number;
  }>('/subscriptions', params);
}

export function getSubscriptionById(subscription_id: string) {
  return api.get<Subscription>(`/subscriptions/${subscription_id}`);
}

export function createSubscription(data: {
  user_id: string;
  plan_id: string;
  billing_period?: string;
  auto_renew?: boolean;
  notes?: string;
}) {
  return api.post<Subscription>('/subscriptions', data);
}

export function updateSubscription(subscription_id: string, data: Partial<Subscription>) {
  return api.put<Subscription>(`/subscriptions/${subscription_id}`, data);
}

export function cancelSubscription(subscription_id: string) {
  return api.post<{ cancelled: boolean }>(`/subscriptions/${subscription_id}/cancel`);
}

export type UpgradeSubscriptionRequest = {
  target_plan_code: string;
  proration_amount?: number;
  effective_immediately?: boolean;
};

export type UpgradeSubscriptionResponse = {
  success: boolean;
  data: {
    subscription: Subscription;
    proration_details: {
      amount_due: number;
      proration_amount: number;
      description: string;
    };
    payment_required: boolean;
  };
};

export function upgradeSubscription(subscription_id: string, data: UpgradeSubscriptionRequest) {
  return api.post<UpgradeSubscriptionResponse>(`/subscriptions/${subscription_id}/upgrade`, data);
}

export type GetMySubscriptionResponse = {
  success: boolean;
  data: {
    subscription: Subscription & {
      plans: {
        code: string;
        price: number;
      };
    };
  };
};

export function getMySubscription() {
  return api.get<GetMySubscriptionResponse>('/subscriptions/me');
}

export function getPayments(params: GetPaymentsParams = {}) {
  return api.get<{ payments: Payment[]; total: number }>('/payments', params);
}

export function getPaymentById(payment_id: string) {
  return api.get<Payment>(`/payments/${payment_id}`);
}

export function createPayment(data: {
  subscription_id: string;
  amount: number;
  currency: string;
  payment_method: string;
}) {
  return api.post<Payment>('/payments', data);
}

export function refundPayment(payment_id: string, amount?: number) {
  return api.post<{ refunded: boolean }>(`/payments/${payment_id}/refund`, { amount });
}

// Check if a plan is currently being used by any active subscriptions
export async function checkPlanUsage(planCode: string): Promise<{
  isUsed: boolean;
  activeSubscriptions: number;
  totalSubscriptions: number;
  cancelledSubscriptions: number;
  expiredSubscriptions: number;
}> {
  try {
    // Get all subscriptions (with high limit to ensure we get all)
    const response = await getSubscriptions({ limit: 1000 });
    const subscriptions = response.data || [];

    // Filter subscriptions by plan code
    const planSubscriptions = subscriptions.filter((sub) => sub.plan_code === planCode);

    // Count subscriptions by status
    const activeSubscriptions = planSubscriptions.filter((sub) => sub.status === 'active').length;

    const cancelledSubscriptions = planSubscriptions.filter(
      (sub) => sub.status === 'cancelled'
    ).length;

    const expiredSubscriptions = planSubscriptions.filter((sub) => sub.status === 'expired').length;

    return {
      isUsed: activeSubscriptions > 0, // Only block deletion if there are active subscriptions
      activeSubscriptions,
      totalSubscriptions: planSubscriptions.length,
      cancelledSubscriptions,
      expiredSubscriptions,
    };
  } catch (_error) {
    // If we can't check, assume it's safe (fail-open approach)
    return {
      isUsed: false,
      activeSubscriptions: 0,
      totalSubscriptions: 0,
      cancelledSubscriptions: 0,
      expiredSubscriptions: 0,
    };
  }
}

export type GetAdminSubscriptionsParams = {
  page?: number;
  limit?: number;
  status?: 'active' | 'trialing' | 'suspended' | 'cancelled' | 'expired';
  planCode?: string;
  userId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: 'created_at' | 'updated_at' | 'current_period_end' | 'amount';
  sortOrder?: 'asc' | 'desc';
};

export type AdminSubscriptionItem = {
  id: string;
  user_id: string;
  plan_code: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  created_at: string;
  updated_at: string;
  user: {
    email: string;
    name: string;
  };
  plan: {
    name: string;
    amount: number;
    currency: string;
  };
};

export type AdminSubscriptionsResponse = {
  data: AdminSubscriptionItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

/**
 * Get admin subscription list with advanced filtering and search
 * Used for web admin dashboard subscription management
 */
export function getAdminSubscriptions(params: GetAdminSubscriptionsParams = {}) {
  return api.get<AdminSubscriptionsResponse>('/subscriptions/admin/subscriptions', params);
}
