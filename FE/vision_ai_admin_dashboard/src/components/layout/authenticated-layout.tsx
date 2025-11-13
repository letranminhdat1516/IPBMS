import Cookies from 'js-cookie';

import { useEffect } from 'react';

import { Outlet, useRouter } from '@tanstack/react-router';

import { AppSidebar } from '@/components/layout/app-sidebar';

import { SidebarProvider } from '@/components/ui/sidebar';

import SkipToMain from '@/components/skip-to-main';

import { SearchProvider } from '@/context/search-context';

import { useAuth } from '@/hooks/use-auth';

import { cn } from '@/lib/utils';

import { getMe } from '@/services/auth';

interface Props {
  children?: React.ReactNode;
}

export function AuthenticatedLayout({ children }: Props) {
  const defaultOpen = Cookies.get('sidebar_state') !== 'false';
  const { reset } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const check = async () => {
      try {
        await getMe();
      } catch (err) {
        const status =
          typeof err === 'object' && err && 'status' in err
            ? ((err as { status?: number }).status ?? 0)
            : 0;
        if ([401, 403, 404, 410].includes(status)) {
          reset();
          router.navigate({ to: '/sign-in', search: { redirect: window.location.href } });
        }
      }
    };
    check(); // Chỉ check một lần khi mount
  }, [reset, router]);
  return (
    <SearchProvider>
      <SidebarProvider defaultOpen={defaultOpen}>
        <SkipToMain />
        <AppSidebar />
        <div
          id='content'
          className={cn(
            'ml-auto w-full max-w-full',
            'peer-data-[state=collapsed]:w-[calc(100%-var(--sidebar-width-icon)-1rem)]',
            'peer-data-[state=expanded]:w-[calc(100%-var(--sidebar-width))]',
            'sm:transition-[width] sm:duration-200 sm:ease-linear',
            'flex h-svh flex-col',
            'group-data-[scroll-locked=1]/body:h-full',
            'has-[main.fixed-main]:group-data-[scroll-locked=1]/body:h-svh'
          )}
        >
          {children ? children : <Outlet />}
        </div>
      </SidebarProvider>
    </SearchProvider>
  );
}
