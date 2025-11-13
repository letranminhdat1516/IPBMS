import { useQuery } from '@tanstack/react-query';

import api from '@/lib/api';

import { type User } from '@/types/user';

// Updated to match actual API response format
export type UsersResponse = User[];

export type PaginatedUsersResponse = {
  data: User[];
  total: number;
  page: number;
  limit: number;
};

export type UserFilters = {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  is_active?: boolean;
};

export function getUsers(params?: UserFilters) {
  return api.get<UsersResponse | PaginatedUsersResponse>('/users', params);
}

export function getUserById(userId: string | number) {
  return api.get<User>(`/users/${userId}`);
}

export function useUsers(params?: UserFilters) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: async () => {
      const response = await getUsers(params);
      if (Array.isArray(response)) {
        return {
          users: response,
          pagination: {
            page: params?.page || 1,
            limit: params?.limit || 10,
            total: response.length,
            total_pages: Math.ceil(response.length / (params?.limit || 10)),
          },
        };
      }
      return {
        users: response.data,
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

export function searchUsers(params: {
  keyword?: string;
  q?: string;
  page?: number;
  limit?: number;
  order?: string;
}) {
  // Support both keyword and q; backend accepts either per guide
  const query: Record<string, string | number | boolean | undefined> = {
    keyword: params.keyword,
    q: params.q ?? params.keyword,
    page: params.page,
    limit: params.limit,
    order: params.order,
  };
  return api.get<PaginatedUsersResponse>('/users/search', query);
}

// Batch summary for users (service tier, cameras, alerts, payment status)
export type UserSummary = {
  user_id: number | string;
  service_tier?: string;
  cameras_active?: number;
  cameras_total?: number;
  alerts_today?: number;
  latest_payment_status?: string;
};

export function getUsersSummary(params: { ids: Array<string | number> }) {
  const query = new URLSearchParams();
  query.set('ids', params.ids.map(String).join(','));
  return api.get<UserSummary[]>(`/users/summary?${query.toString()}`);
}

// Tạo mới user
export function createUser(body: {
  username: string;
  email: string;
  phone_number?: string;
  pin: string;
  full_name: string;
  role?: string;
}) {
  return api.post<User>('/users', body);
}

// Cập nhật user
export function updateUser(id: string | number, body: Partial<User> & { password?: string }) {
  return api.put<User>(`/users/${id}`, body);
}

// Xóa user
export function deleteUser(id: string | number) {
  return api.delete<{ deleted: boolean }>(`/users/${id}`);
}

// Mời user qua email
export function inviteUser(body: { email: string; role?: string; desc?: string }) {
  return api.post<{ invited: boolean; email: string; role?: string }>(`/users/invite`, body);
}
