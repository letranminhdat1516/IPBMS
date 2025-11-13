import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { SharedPermissionsService } from '../../application/services/shared-permissions.service';
import { createBadRequestException } from '../utils';
import { logInvalidUuidOccurrence } from '../utils/invalid-uuid-logger.util';
import { isValidUuid } from '../utils/uuid.util';

@Injectable()
export class LogAccessGuard implements CanActivate {
  private readonly logger = new Logger(LogAccessGuard.name);
  constructor(private readonly sharedPermissionsService: SharedPermissionsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;

    // Admin có quyền truy cập tất cả logs
    if (user.role === 'admin') {
      return true;
    }

    // Determine the requested target user id from params or query. Support multiple names used across endpoints.
    // support route param names: userId (activity-logs) or id (users controller)
    const targetUserId =
      req.params?.userId ??
      req.params?.id ??
      req.query?.userId ??
      req.query?.user_id ??
      req.query?.customer_id ??
      null;

    // If no explicit target is provided:
    // - allow customers to view their own logs (they will hit endpoints without target)
    // - allow caregivers to view their own logs (controller will default to their userId)
    if (!targetUserId) {
      if (user.role === 'customer' || user.role === 'caregiver') return true;
      throw new ForbiddenException('Missing target user id to check log access');
    }

    // If the requester asks for their own logs, allow.
    if (String(user.userId) === String(targetUserId)) return true;

    // Validate UUIDs early to avoid downstream DB errors
    if (!isValidUuid(String(user.userId)) || !isValidUuid(String(targetUserId))) {
      this.logger.warn(
        `Invalid UUID detected in log access check: requester=${user.userId} target=${targetUserId}`,
      );
      try {
        logInvalidUuidOccurrence(req, 'Invalid UUID in LogAccessGuard', {
          requester: user.userId,
          target: targetUserId,
        });
      } catch {
        // ignore logging errors
      }
      throw createBadRequestException('UUID không hợp lệ cho requester hoặc target');
    }

    // Otherwise, check shared permission (e.g., caregiver assigned to this customer)
    const allowed = await this.sharedPermissionsService.checkPermission(
      targetUserId,
      user.userId,
      'log_access_days',
    );

    if (!allowed) {
      throw new ForbiddenException('Bạn không có quyền xem logs');
    }

    return true;
  }
}
