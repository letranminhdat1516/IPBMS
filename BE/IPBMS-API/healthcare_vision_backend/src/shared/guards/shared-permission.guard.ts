import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { isValidUuid } from '../utils/uuid.util';
import { createBadRequestException } from '../utils';
import { logInvalidUuidOccurrence } from '../utils/invalid-uuid-logger.util';
import { Reflector } from '@nestjs/core';
import { SharedPermissionsService } from '../../application/services/shared-permissions.service';
import {
  BooleanPermissionKey,
  SHARED_PERMISSION_KEY,
} from '../decorators/shared-permission.decorator';
import { SKIP_SHARED_PERMISSION_KEY } from '../decorators/skip-shared-permission.decorator';
import { PrismaService } from '../../infrastructure/database/prisma.service';

interface AuthUser {
  userId: string;
  role: string;
  phone_number?: string;
}

@Injectable()
export class SharedPermissionGuard implements CanActivate {
  private readonly _logger = new Logger(SharedPermissionGuard.name);
  constructor(
    private readonly _reflector: Reflector,
    private readonly _sharedPermissionService: SharedPermissionsService,
    private readonly _prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skipGuard = this._reflector.getAllAndOverride<boolean>(SKIP_SHARED_PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipGuard) return true;

    const permissionKey = this._reflector.get<BooleanPermissionKey>(
      SHARED_PERMISSION_KEY,
      context.getHandler(),
    );

    if (!permissionKey) return true; // không yêu cầu check thì cho qua

    const req = context.switchToHttp().getRequest();
    const user = req.user as AuthUser | undefined;

    // If there's no authenticated user, deny early
    if (!user) {
      this._logDenied(undefined, permissionKey, undefined, 'Missing authenticated user');
      throw new ForbiddenException('Missing authenticated user');
    }

    // Admin có thể truy cập tất cả dữ liệu
    if (user.role === 'admin') {
      return true;
    }

    let targetUserId = await this._determineTargetUserId(req, user, permissionKey);

    // Nếu user là customer và đang truy cập dữ liệu của chính họ -> cho phép
    if (user.role === 'customer' && user.userId === targetUserId) {
      return true;
    }

    // chỉ caregiver mới dùng được shared permission với user khác
    if (user.role !== 'caregiver') {
      throw new ForbiddenException('Chỉ caregiver mới có thể truy cập dữ liệu được chia sẻ');
    }

    if (!targetUserId) {
      this._logDenied(user, permissionKey, undefined, 'Không xác định được customer đích');
      throw new ForbiddenException('Không xác định được customer cho quyền truy cập');
    }

    const customerId = targetUserId;
    const caregiverId = user.userId;

    if (!customerId || !caregiverId) {
      this._logDenied(user, permissionKey, customerId, 'Thiếu customer_id hoặc caregiver_id');
      throw new ForbiddenException('Thiếu customer_id hoặc caregiver_id');
    }

    // Validate UUIDs early
    if (!isValidUuid(customerId) || !isValidUuid(caregiverId)) {
      this._logDenied(
        user,
        permissionKey,
        customerId,
        'Invalid UUID for customerId or caregiverId',
      );
      try {
        logInvalidUuidOccurrence(req, 'Invalid UUID in SharedPermissionGuard', {
          customerId,
          caregiverId,
          permissionKey,
        });
      } catch {
        // ignore
      }
      throw createBadRequestException('UUID không hợp lệ cho customerId hoặc caregiverId');
    }

    // Kiểm tra shared-permission record
    let record: any = null;
    try {
      record = await this._sharedPermissionService.getByCustomerAndCaregiver(
        customerId,
        caregiverId,
      );
    } catch {
      // Nếu không có record, trả về thông báo hướng dẫn gửi request quyền
      this._logDenied(user, permissionKey, customerId, 'No shared permission record');
      throw new ForbiddenException({
        message: `Caregiver chưa được cấp quyền truy cập. Vui lòng gửi yêu cầu quyền truy cập cho customer.`,
        action: 'request_permission',
        endpoint: '/permission-requests',
        customerId,
        caregiverId,
        permissionKey,
      });
    }

    // Nếu có record nhưng quyền bị tắt
    const hasPermission = Boolean(record[permissionKey]);
    if (!hasPermission) {
      this._logDenied(user, permissionKey, customerId, 'Permission disabled');
      throw new ForbiddenException({
        message: `Caregiver đã bị customer thu hồi quyền '${permissionKey}'.`,
        action: 'request_permission',
        endpoint: '/permission-requests',
        customerId,
        caregiverId,
        permissionKey,
      });
    }

    return true;
  }

  private _logDenied(
    user: AuthUser | undefined,
    permissionKey: string | undefined,
    customerId: string | undefined,
    reason: string,
  ) {
    try {
      this._logger.warn(
        `[SharedPermissionGuard] access denied: user=${user?.userId} role=${user?.role} target=${customerId} permission=${permissionKey} reason=${reason}`,
      );
    } catch {
      // ignore logging failures
    }
  }

  private async _determineTargetUserId(
    req: any,
    user: AuthUser | undefined,
    permissionKey: string | undefined,
  ): Promise<string | undefined> {
    const direct = this._extractDirectUserId(req);
    if (direct) return direct;

    const resolved = await this._resolveFromReferences(req, user, permissionKey);
    if (resolved) return resolved;

    if (user?.role === 'customer') return user.userId;
    return undefined;
  }

  private _extractDirectUserId(req: any): string | undefined {
    const keyGroups = [
      ['id'],
      ['customer_id', 'customerId'],
      ['user_id', 'userId'],
      ['patient_id', 'patientId'],
      ['target_user_id', 'targetUserId'],
      ['owner_id', 'ownerId'],
      ['account_id', 'accountId'],
    ];

    for (const keys of keyGroups) {
      const value =
        this._getFirstString(req.params, keys) ??
        this._getFirstString(req.query, keys) ??
        this._getFirstString(req.body, keys);
      if (value) return value;
    }
    return undefined;
  }

  private async _resolveFromReferences(
    req: any,
    user: AuthUser | undefined,
    permissionKey: string | undefined,
  ): Promise<string | undefined> {
    const eventId = this._getFirstStringFromRequest(req, ['event_id', 'eventId']);
    if (eventId) {
      try {
        const event = await this._prisma.events.findUnique({
          where: { event_id: eventId },
          select: { user_id: true },
        });
        if (event?.user_id) return event.user_id;
        this._logDenied(user, permissionKey, undefined, `Event ${eventId} not found`);
      } catch (err) {
        this._logDenied(
          user,
          permissionKey,
          undefined,
          `Failed to resolve event ${eventId}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    const cameraId = this._getFirstStringFromRequest(req, ['camera_id', 'cameraId']);
    if (cameraId) {
      try {
        const camera = await this._prisma.cameras.findUnique({
          where: { camera_id: cameraId },
          select: { user_id: true },
        });
        if (camera?.user_id) return camera.user_id;
        this._logDenied(user, permissionKey, undefined, `Camera ${cameraId} not found`);
      } catch (err) {
        this._logDenied(
          user,
          permissionKey,
          undefined,
          `Failed to resolve camera ${cameraId}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    const snapshotId = this._getFirstStringFromRequest(req, ['snapshot_id', 'snapshotId']);
    if (snapshotId) {
      try {
        const snapshot = await this._prisma.snapshots.findUnique({
          where: { snapshot_id: snapshotId },
          select: { user_id: true },
        });
        if (snapshot?.user_id) return snapshot.user_id;
        this._logDenied(user, permissionKey, undefined, `Snapshot ${snapshotId} not found`);
      } catch (err) {
        this._logDenied(
          user,
          permissionKey,
          undefined,
          `Failed to resolve snapshot ${snapshotId}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    const notificationId = this._getFirstStringFromRequest(req, [
      'notification_id',
      'notificationId',
    ]);
    if (notificationId) {
      try {
        const notification = await this._prisma.notifications.findUnique({
          where: { notification_id: notificationId },
          select: { user_id: true },
        });
        if (notification?.user_id) return notification.user_id;
        this._logDenied(user, permissionKey, undefined, `Notification ${notificationId} not found`);
      } catch (err) {
        this._logDenied(
          user,
          permissionKey,
          undefined,
          `Failed to resolve notification ${notificationId}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    return undefined;
  }

  private _getFirstStringFromRequest(req: any, keys: string[]): string | undefined {
    return (
      this._getFirstString(req.params, keys) ??
      this._getFirstString(req.query, keys) ??
      this._getFirstString(req.body, keys)
    );
  }

  private _getFirstString(source: any, keys: string[]): string | undefined {
    if (!source) return undefined;
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed.length > 0) return trimmed;
      }
    }
    return undefined;
  }
}
