// Refactor: Sử dụng hook lấy thông tin bệnh nhân và liên hệ khẩn cấp từ API
import { useQuery } from '@tanstack/react-query';

import { getEmergencyContacts, useUserMedicalInfo } from '@/services/userDetail';

// Hook lấy thông tin bệnh nhân
export function usePatientInfo(userId: string | number) {
  return useUserMedicalInfo(userId);
}

// Custom hook lấy danh sách liên hệ khẩn cấp bằng React Query
export function useEmergencyContactsQuery(userId: string | number, enabled = true) {
  return useQuery({
    queryKey: ['emergency-contacts', userId],
    queryFn: () => getEmergencyContacts(userId),
    enabled: Boolean(userId) && enabled,
    staleTime: 60_000,
  });
}
