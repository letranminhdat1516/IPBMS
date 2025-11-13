import { SetMetadata } from '@nestjs/common';

export const SYSTEM_PERMISSION_KEY = 'system_permission';

export type SystemPermission = string;

export const Permission = (permission: SystemPermission) =>
  SetMetadata(SYSTEM_PERMISSION_KEY, permission);
