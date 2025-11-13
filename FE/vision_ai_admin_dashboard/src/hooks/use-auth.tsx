import { useAuthStore } from '@/stores/authStore';

export const useAuth = () => {
  const auth = useAuthStore((state) => state.auth);
  return {
    ...auth,
    // Computed effective user (primary user || userDetails)
    effectiveUser: auth.user || auth.userDetails,
  };
};
