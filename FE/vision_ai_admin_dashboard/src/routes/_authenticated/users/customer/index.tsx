import { createFileRoute } from '@tanstack/react-router';

import Users from '@/pages/users/customers';

export const Route = createFileRoute('/_authenticated/users/customer/')({
  component: Users,
});
