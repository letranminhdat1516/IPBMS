import { createFileRoute } from '@tanstack/react-router';

import AlertsPage from '@/pages/alerts';

export const Route = createFileRoute('/_authenticated/alerts/')({
  component: AlertsPage,
});
