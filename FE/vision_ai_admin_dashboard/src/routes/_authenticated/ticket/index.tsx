import { createFileRoute } from '@tanstack/react-router';

import TicketPage from '@/pages/ticket';

export const Route = createFileRoute('/_authenticated/ticket/')({
  component: TicketPage,
});
