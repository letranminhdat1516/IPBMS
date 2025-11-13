import { createFileRoute, redirect } from '@tanstack/react-router';

import { AuthenticatedLayout } from '@/components/layout/authenticated-layout';

import { useAuthStore } from '@/stores/authStore';

import { getMe } from '@/services/auth';

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ location }) => {
    const {
      auth: { user, accessToken },
    } = useAuthStore.getState();

    // If there's no user and no token, force sign-in and preserve return URL
    if (!user && !accessToken) {
      throw redirect({ to: '/sign-in', search: { redirect: location.href } });
    }

    // Verify account existence on the server; if missing or unauthorized, sign out
    try {
      await getMe();
    } catch (err) {
      // Enhanced error handling - any API failure should trigger logout
      // Previous code only checked specific status codes [401, 403, 404, 410]
      // but network errors, 500s, timeouts should also invalidate session
      const status =
        typeof err === 'object' && err && 'status' in err
          ? ((err as { status?: number }).status ?? 0)
          : 0;

      // For auth endpoints, be strict: any error means invalid session
      // Only allow through if it's a temporary server issue (503) and we have valid token structure
      const isTemporaryServerIssue = status === 503;
      const hasValidTokenStructure = accessToken && accessToken.split('.').length === 3;

      if (!isTemporaryServerIssue || !hasValidTokenStructure) {
        useAuthStore.getState().auth.reset();
        throw redirect({ to: '/sign-in', search: { redirect: location.href } });
      }

      // If it's 503 and we have valid token structure, allow through
    }
  },
  component: AuthenticatedLayout,
});
