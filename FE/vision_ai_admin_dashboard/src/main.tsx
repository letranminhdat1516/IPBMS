import { toast } from 'sonner';

import { StrictMode } from 'react';

import ReactDOM from 'react-dom/client';

import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createRouter } from '@tanstack/react-router';

import { createEnhancedQueryClient } from '@/lib/enhanced-query-client';

import { useAuthStore } from '@/stores/authStore';

import { handleServerError } from '@/utils/handle-server-error';

import { FontProvider } from './context/font-context';
import { ThemeProvider } from './context/theme-context';
import './index.css';
// Generated Routes
import { routeTree } from './routeTree.gen';

// Create a new router instance
const router = createRouter({
  routeTree,
  context: { queryClient: undefined! },
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
});

// Create enhanced query client with intelligent error handling
const queryClient = createEnhancedQueryClient({
  onAuthError: () => {
    toast.error('Session expired!');
    useAuthStore.getState().auth.reset();
    const redirect = `${router.history.location.href}`;
    router.navigate({ to: '/sign-in', search: { redirect } });
  },
  onServerError: (error: unknown) => {
    handleServerError(error);
    router.navigate({ to: '/500' });
  },
  onForbiddenError: () => {
    toast.error('Forbidden! You do not have permission to access this resource.');
    router.navigate({ to: '/403' });
  },
});

// Update router context with the query client
router.update({
  context: { queryClient },
});

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

// Render the app
const rootElement = document.getElementById('root')!;

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);

  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme='system' storageKey='vite-ui-theme'>
          <FontProvider>
            {/* <SearchProvider> */}
            <RouterProvider router={router} />
            {/* </SearchProvider> */}
          </FontProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </StrictMode>
  );
}
