import { useState } from 'react';

import { useQuery } from '@tanstack/react-query';

import { type User } from '@/types/user';

import { searchUsers } from '@/services/users';

export function useSearchUserByPhone() {
  const [phoneNumber, setPhoneNumber] = useState('');

  const {
    data: response,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['searchUserByPhone', phoneNumber],
    queryFn: async () => {
      if (!phoneNumber.trim()) return { data: [], total: 0, page: 1, limit: 10 };
      const result = await searchUsers({
        keyword: phoneNumber.trim(),
        limit: 10,
      });
      return result;
    },
    enabled: phoneNumber.trim().length > 0,
    staleTime: 30_000,
  });

  // Extract users array from paginated response
  const users = response?.data || [];

  const searchByPhone = (phone: string) => {
    setPhoneNumber(phone);
  };

  const clearSearch = () => {
    setPhoneNumber('');
  };

  return {
    users,
    isLoading,
    error,
    searchByPhone,
    clearSearch,
    hasSearched: phoneNumber.trim().length > 0,
  };
}

export function useUserSelection() {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const selectUser = (user: User) => {
    setSelectedUser(user);
  };

  const clearSelection = () => {
    setSelectedUser(null);
  };

  return {
    selectedUser,
    selectUser,
    clearSelection,
    hasSelectedUser: selectedUser !== null,
  };
}
