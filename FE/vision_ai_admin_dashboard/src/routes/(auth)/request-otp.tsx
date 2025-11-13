import { createFileRoute } from '@tanstack/react-router';

import OtpRequestPage from '@/pages/auth/otp/request';

export const Route = createFileRoute('/(auth)/request-otp')({
  component: OtpRequestPage,
});
