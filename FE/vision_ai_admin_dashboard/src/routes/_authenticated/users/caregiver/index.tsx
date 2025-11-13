import { createFileRoute } from '@tanstack/react-router';

import CaregiversPage from '@/pages/users/caregivers';

export const Route = createFileRoute('/_authenticated/users/caregiver/')({
  component: CaregiversPage,
});
