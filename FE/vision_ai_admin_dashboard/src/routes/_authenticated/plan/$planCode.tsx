import { createFileRoute } from '@tanstack/react-router';

import PlanDetailPage from '@/pages/plan/detail/[detail]';

export const Route = createFileRoute('/_authenticated/plan/$planCode')({
  component: PlanDetailPage,
});
