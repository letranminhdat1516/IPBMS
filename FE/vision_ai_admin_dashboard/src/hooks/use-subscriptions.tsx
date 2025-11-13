import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Subscription } from '@/types/subscription';

import {
  type GetAdminSubscriptionsParams,
  type GetPaymentsParams,
  type GetSubscriptionsParams,
  cancelSubscription,
  createPayment,
  createSubscription,
  getAdminSubscriptions,
  getPaymentById,
  getPayments,
  getSubscriptionById,
  getSubscriptions,
  refundPayment,
  updateSubscription,
} from '@/services/subscriptions';
import { getUserById } from '@/services/users';

export function useSubscriptions(params?: GetSubscriptionsParams) {
  return useQuery({
    queryKey: ['subscriptions', params],
    queryFn: async () => {
      const response = await getSubscriptions(params);
      return {
        subscriptions: response.data,
        total: response.total,
        pagination: {
          page: response.page,
          limit: response.limit,
          total: response.total,
          total_pages: Math.ceil(response.total / response.limit),
        },
      };
    },
    staleTime: 30_000,
  });
}

export function useSubscriptionsWithUsers(params?: GetSubscriptionsParams) {
  return useQuery({
    queryKey: ['subscriptions-with-users', params],
    queryFn: async () => {
      const response = await getSubscriptions(params);

      // Fetch user info for each subscription
      const subscriptionsWithUsers = await Promise.all(
        response.data.map(async (subscription) => {
          try {
            const user = await getUserById(subscription.user_id);
            return {
              ...subscription,
              user,
            };
          } catch (_error) {
            // If user fetch fails, return subscription without user info
            return subscription;
          }
        })
      );

      return {
        subscriptions: subscriptionsWithUsers,
        total: response.total,
        pagination: {
          page: response.page,
          limit: response.limit,
          total: response.total,
          total_pages: Math.ceil(response.total / response.limit),
        },
      };
    },
    staleTime: 30_000,
  });
}

export function useSubscription(subscription_id: string) {
  return useQuery({
    queryKey: ['subscription', subscription_id],
    queryFn: () => getSubscriptionById(subscription_id),
    enabled: !!subscription_id,
  });
}

export function useCreateSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    },
  });
}

export function useUpdateSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      subscription_id,
      data,
    }: {
      subscription_id: string;
      data: Partial<Subscription>;
    }) => updateSubscription(subscription_id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    },
  });
}

export function useCancelSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cancelSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    },
  });
}

export function usePayments(params?: GetPaymentsParams) {
  return useQuery({
    queryKey: ['payments', params],
    queryFn: async () => {
      const response = await getPayments(params);
      return {
        payments: response.payments,
        total: response.total,
        pagination: {
          page: params?.page || 1,
          limit: params?.limit || 10,
          total: response.total,
          total_pages: Math.ceil(response.total / (params?.limit || 10)),
        },
      };
    },
    staleTime: 30_000,
  });
}

export function usePayment(payment_id: string) {
  return useQuery({
    queryKey: ['payment', payment_id],
    queryFn: () => getPaymentById(payment_id),
    enabled: !!payment_id,
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
  });
}

export function useRefundPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ payment_id, amount }: { payment_id: string; amount?: number }) =>
      refundPayment(payment_id, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payment'] });
    },
  });
}

export function useAdminSubscriptions(params?: GetAdminSubscriptionsParams) {
  return useQuery({
    queryKey: ['admin-subscriptions', params],
    queryFn: () => getAdminSubscriptions(params),
    staleTime: 30_000,
  });
}
