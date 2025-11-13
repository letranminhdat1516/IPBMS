import { createFileRoute } from '@tanstack/react-router';

import EventsPage from '@/pages/events';

export const Route = createFileRoute('/_authenticated/events/')({
  component: EventsPage,
});
