import { createFileRoute } from '@tanstack/react-router';

import EmailTemplatesPage from '@/pages/email-templates';

export const Route = createFileRoute('/_authenticated/email-templates/')({
  component: EmailTemplatesPage,
});
