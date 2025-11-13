// Refactor: Sử dụng hook lấy danh sách khách hàng từ API
import { useUsers } from '@/services/users';

// userTypes và callTypes giữ nguyên nếu dùng cho UI
// Danh sách vai trò cho UI
export const userTypes = [
  { label: 'Khách hàng', value: 'customer' },
  { label: 'Người chăm sóc', value: 'caregiver' },
  { label: 'Admin', value: 'admin' },
  // Thêm các vai trò khác nếu cần
];

// Hook lấy danh sách khách hàng từ API
export function useCustomerList(params?: { page?: number; limit?: number; q?: string }) {
  return useUsers(params);
}
