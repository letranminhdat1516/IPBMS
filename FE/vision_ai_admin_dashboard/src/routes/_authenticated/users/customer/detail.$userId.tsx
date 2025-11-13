import { createFileRoute } from '@tanstack/react-router';

import UserDetail from '@/pages/users/customers/detail/[userId]';

export const Route = createFileRoute('/_authenticated/users/customer/detail/$userId')({
  component: UserDetail,
});
