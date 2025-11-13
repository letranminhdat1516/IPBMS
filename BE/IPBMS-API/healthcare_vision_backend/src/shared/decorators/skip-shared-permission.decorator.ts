import { SetMetadata } from '@nestjs/common';

export const SKIP_SHARED_PERMISSION_KEY = 'skipSharedPermissionGuard';

export const SkipSharedPermissionGuard = () => SetMetadata(SKIP_SHARED_PERMISSION_KEY, true);
