import { createFileRoute } from '@tanstack/react-router';

import PlanPage from '@/pages/plan';

export const Route = createFileRoute('/_authenticated/plan/')({
  component: PlanPage,
});
