import { createFileRoute } from '@tanstack/react-router';

import RolesPermissionsManagementPage from '@/pages/roles_permissions';

export const Route = createFileRoute('/_authenticated/roles_permissions/')({
  component: RolesPermissionsManagementPage,
});
