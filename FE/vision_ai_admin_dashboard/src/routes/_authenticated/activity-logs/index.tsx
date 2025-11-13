import { createFileRoute } from '@tanstack/react-router';

import ActivityLogsPage from '@/pages/activity-logs';

export const Route = createFileRoute('/_authenticated/activity-logs/')({
  component: ActivityLogsPage,
});
