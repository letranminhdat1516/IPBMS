import { createFileRoute } from '@tanstack/react-router';

import TicketDetail from '@/pages/ticket/detail/[ticketId]';

export const Route = createFileRoute('/_authenticated/ticket/detail/$ticketId')({
  component: TicketDetail,
});
