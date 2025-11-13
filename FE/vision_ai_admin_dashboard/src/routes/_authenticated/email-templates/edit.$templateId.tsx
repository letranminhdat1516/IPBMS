import { createFileRoute } from '@tanstack/react-router';

import EditEmailTemplatePage from '@/pages/email-templates/edit';

export const Route = createFileRoute('/_authenticated/email-templates/edit/$templateId')({
  component: EditEmailTemplatePage,
});
