import { createFileRoute } from '@tanstack/react-router';

import CaregiverInvitationsPage from '@/pages/caregiver-invitations';

export const Route = createFileRoute('/_authenticated/caregiver-invitations/')({
  component: CaregiverInvitationsPage,
});
