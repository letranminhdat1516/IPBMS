import { createFileRoute } from '@tanstack/react-router';

import SubscriptionDetail from '@/pages/subscriptions/detail/[subscriptionId]';

export const Route = createFileRoute('/_authenticated/subscriptions/$subscriptionId')({
  component: SubscriptionDetail,
});
