import Cookies from 'js-cookie';
import { create } from 'zustand';

import type { User } from '@/types/user';

import { getMe } from '@/services/auth';

const ACCESS_TOKEN = 'thisisjustarandomstring';

interface AuthState {
  auth: {
    user: User | null;
    userDetails: User | null;
    loadingDetails: boolean;
    setUser: (user: User | null) => void;
    setUserDetails: (userDetails: User | null) => void;
    setLoadingDetails: (loading: boolean) => void;
    refetchUserDetails: () => Promise<void>;
    accessToken: string;
    setAccessToken: (accessToken: string) => void;
    resetAccessToken: () => void;
    reset: () => void;
  };
}

export const useAuthStore = create<AuthState>()((set) => {
  const cookieState = Cookies.get(ACCESS_TOKEN);
  const initToken = cookieState || '';
  return {
    auth: {
      user: null,
      userDetails: null,
      loadingDetails: false,
      setUser: (user) => set((state) => ({ ...state, auth: { ...state.auth, user } })),
      setUserDetails: (userDetails) =>
        set((state) => ({ ...state, auth: { ...state.auth, userDetails } })),
      setLoadingDetails: (loading) =>
        set((state) => ({ ...state, auth: { ...state.auth, loadingDetails: loading } })),
      refetchUserDetails: async () => {
        const { auth } = useAuthStore.getState();
        if (!auth.accessToken) return;

        auth.setLoadingDetails(true);
        try {
          const response = await getMe();
          auth.setUserDetails(response.user);
        } catch {
          auth.setUserDetails(null);
        } finally {
          auth.setLoadingDetails(false);
        }
      },
      accessToken: initToken,
      setAccessToken: (accessToken) =>
        set((state) => {
          Cookies.set(ACCESS_TOKEN, accessToken, {
            domain: 'localhost',
            path: '/',
            sameSite: 'lax',
            secure: false, // development only
          });
          return { ...state, auth: { ...state.auth, accessToken } };
        }),
      resetAccessToken: () =>
        set((state) => {
          Cookies.remove(ACCESS_TOKEN, {
            domain: 'localhost',
            path: '/',
          });
          return { ...state, auth: { ...state.auth, accessToken: '' } };
        }),
      reset: () =>
        set((state) => {
          Cookies.remove(ACCESS_TOKEN, {
            domain: 'localhost',
            path: '/',
          });
          return {
            ...state,
            auth: {
              ...state.auth,
              user: null,
              userDetails: null,
              loadingDetails: false,
              accessToken: '',
            },
          };
        }),
    },
  };
});
