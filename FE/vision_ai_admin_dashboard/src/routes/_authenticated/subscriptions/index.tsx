import { createFileRoute } from '@tanstack/react-router';

import Subscriptions from '@/pages/subscriptions';

export const Route = createFileRoute('/_authenticated/subscriptions/')({
  component: Subscriptions,
});
