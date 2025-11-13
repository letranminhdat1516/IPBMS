import { createFileRoute } from '@tanstack/react-router';

import TransactionPage from '@/pages/transactions';

export const Route = createFileRoute('/_authenticated/transactions/')({
  component: TransactionPage,
});
