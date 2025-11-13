import { SetMetadata } from '@nestjs/common';

export const LOG_ACCESS_KEY = 'log_access';
export const LogAccess = () => SetMetadata(LOG_ACCESS_KEY, true);
