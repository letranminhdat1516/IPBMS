import { SetMetadata } from '@nestjs/common';

export const SHARED_PERMISSION_KEY = 'shared_permission';

export type BooleanPermissionKey =
  | 'stream:view'
  | 'stream:edit'
  | 'alert:read'
  | 'alert:ack'
  | 'alert:edit'
  | 'alert:update'
  | 'profile:view'
  | 'profile:update';

export const SharedPermission = (permission: BooleanPermissionKey) =>
  SetMetadata(SHARED_PERMISSION_KEY, permission);
