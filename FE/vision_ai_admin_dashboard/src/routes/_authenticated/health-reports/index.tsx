import { createFileRoute } from '@tanstack/react-router';

import HealthReportsPage from '@/pages/health-reports';

export const Route = createFileRoute('/_authenticated/health-reports/')({
  component: HealthReportsPage,
});
