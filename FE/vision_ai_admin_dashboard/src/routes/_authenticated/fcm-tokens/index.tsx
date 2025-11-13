import { createFileRoute } from '@tanstack/react-router';

import FcmTokenAdminPage from '@/pages/fcm-tokens';

export const Route = createFileRoute('/_authenticated/fcm-tokens/')({
  component: FcmTokenAdminPage,
});
