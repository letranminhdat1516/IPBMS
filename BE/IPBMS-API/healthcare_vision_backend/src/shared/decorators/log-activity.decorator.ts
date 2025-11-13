import { SetMetadata } from '@nestjs/common';
import { ActivityAction, ActivitySeverity } from '../../core/entities/activity_logs.entity';

export interface LogActivityOptions {
  action?: string;
  action_enum?: ActivityAction;
  resource_type?: string;
  resource_id?: string;
  resource_name?: string;
  severity?: ActivitySeverity;
  message?: string;
  meta?: Record<string, any>;
}

export const LOG_ACTIVITY_KEY = 'log_activity';

export const LogActivity = (options: LogActivityOptions) =>
  SetMetadata(LOG_ACTIVITY_KEY, {
    ...options,
    severity: options.severity ?? ActivitySeverity.INFO,
    meta: options.meta ?? {},
    message: options.message ?? null,
  });
