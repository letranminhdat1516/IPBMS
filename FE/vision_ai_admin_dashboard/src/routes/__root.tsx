import { APP_NAME } from '@/constants';

import { QueryClient } from '@tanstack/react-query';
import { Outlet, createRootRouteWithContext } from '@tanstack/react-router';

import { Toaster } from '@/components/ui/sonner';

import { NavigationProgress } from '@/components/navigation-progress';

import GeneralError from '@/pages/errors/general-error';
import NotFoundError from '@/pages/errors/not-found-error';

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  component: () => {
    // Update document title globally
    if (typeof document !== 'undefined' && document.title !== APP_NAME) {
      document.title = APP_NAME;
    }
    return (
      <>
        <NavigationProgress />
        <Outlet />
        <Toaster duration={50000} />
        {/* {import.meta.env.VITE_MODE === 'development' && (
          <>
            <ReactQueryDevtools buttonPosition='bottom-left' />
            <TanStackRouterDevtools position='bottom-right' />
          </>
        )} */}
      </>
    );
  },
  notFoundComponent: NotFoundError,
  errorComponent: GeneralError,
});
