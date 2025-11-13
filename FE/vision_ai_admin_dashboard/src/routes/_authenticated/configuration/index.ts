import { createFileRoute } from '@tanstack/react-router';

import EnhancedConfigurationPage from '@/pages/configuration/enhanced-index';

export const Route = createFileRoute('/_authenticated/configuration/')({
  component: EnhancedConfigurationPage,
});
