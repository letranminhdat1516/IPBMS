import { createFileRoute } from '@tanstack/react-router';

import NewEmailTemplatePage from '@/pages/email-templates/new';

export const Route = createFileRoute('/_authenticated/email-templates/new')({
  component: NewEmailTemplatePage,
});
