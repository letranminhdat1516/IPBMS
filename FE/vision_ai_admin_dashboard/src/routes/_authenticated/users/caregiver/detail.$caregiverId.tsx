import { createFileRoute } from '@tanstack/react-router';

import CaregiverDetail from '@/pages/users/caregivers/detail/[caregiverId]';

export const Route = createFileRoute('/_authenticated/users/caregiver/detail/$caregiverId')({
  component: CaregiverDetail,
});
