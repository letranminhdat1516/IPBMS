import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SharedPermissionsService } from '../../application/services/shared-permissions.service';
import { REPORT_ACCESS_KEY } from '../decorators/report-access.decorator';
import { isValidUuid } from '../utils/uuid.util';
import { createBadRequestException } from '../utils';
import { logInvalidUuidOccurrence } from '../utils/invalid-uuid-logger.util';

interface AuthUser {
  userId: string;
  role: string;
}

@Injectable()
export class ReportAccessGuard implements CanActivate {
  private readonly logger = new Logger(ReportAccessGuard.name);
  constructor(
    private readonly reflector: Reflector,
    private readonly sharedPermissionService: SharedPermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Kiểm tra handler có yêu cầu ReportAccess hay không
    const needReportAccess = this.reflector.get<boolean>(REPORT_ACCESS_KEY, context.getHandler());
    if (!needReportAccess) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user as AuthUser;

    if (!user) {
      throw new ForbiddenException('Missing authenticated user');
    }

    const role = user.role;

    // Admin và Customer luôn có quyền
    if (role === 'admin' || role === 'customer') return true;

    // Caregiver thì cần check DB
    if (role !== 'caregiver') {
      throw new ForbiddenException('Role not supported for report access');
    }

    // Lấy customer_id từ query/body/param
    const customerId = req.query.customer_id || req.body.customer_id || req.params.user_id;
    const caregiverId = user.userId;

    if (!customerId || !caregiverId) {
      throw new ForbiddenException('Thiếu customer_id hoặc caregiver_id');
    }

    // Validate UUIDs early
    if (!isValidUuid(String(customerId)) || !isValidUuid(String(caregiverId))) {
      this.logger.warn(
        `Invalid UUID in report access check: customer=${customerId} caregiver=${caregiverId}`,
      );
      try {
        logInvalidUuidOccurrence(req, 'Invalid UUID in ReportAccessGuard', {
          customerId,
          caregiverId,
        });
      } catch {
        // ignore
      }
      throw createBadRequestException('UUID không hợp lệ cho customerId hoặc caregiverId');
    }

    // Truy vấn DB qua service
    const days = await this.sharedPermissionService.getReportAccessDays(customerId, caregiverId);

    if (!days || days <= 0) {
      throw new ForbiddenException('Không được phép xem báo cáo');
    }

    return true;
  }
}
