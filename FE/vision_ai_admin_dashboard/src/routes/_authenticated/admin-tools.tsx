import { createFileRoute } from '@tanstack/react-router';

import AdminToolsPage from '@/pages/admin-tools';

export const Route = createFileRoute('/_authenticated/admin-tools')({
  component: AdminToolsPage,
});
