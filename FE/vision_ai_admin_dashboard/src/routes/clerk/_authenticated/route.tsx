import { createFileRoute, redirect } from '@tanstack/react-router';

import { AuthenticatedLayout } from '@/components/layout/authenticated-layout';

import { useAuthStore } from '@/stores/authStore';

export const Route = createFileRoute('/clerk/_authenticated')({
  beforeLoad: ({ location }) => {
    const {
      auth: { user, accessToken },
    } = useAuthStore.getState();

    if (!user && !accessToken) {
      throw redirect({ to: '/sign-in', search: { redirect: location.href } });
    }
  },
  component: AuthenticatedLayout,
});
