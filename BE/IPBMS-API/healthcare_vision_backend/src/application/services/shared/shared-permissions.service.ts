import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { SharedPermissionsRepository } from '../../../infrastructure/repositories/permissions/shared-permissions.repository';
import { AccessControlService } from './access-control.service';

import {
  normalizeSharedPermissions,
  validateSharedPermissions,
  SharedPermissions,
} from '../../utils/shared-permissions';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Injectable()
/**
 * SharedPermissionsService
 * - Quản lý (CRUD) các quyền chia sẻ giữa customer và caregiver.
 * - Trả về các object đã normalize để callers dễ tiêu thụ (hỗ trợ cả `alert:read` và `alert_read`).
 * - Khi cập nhật/xóa quyền, service sẽ gọi `AccessControlService.invalidatePair`
 *   để xóa cache liên quan (AccessControlService cache theo cặp caregiver:customer).
 */
export class SharedPermissionsService {
  private readonly logger = new Logger(SharedPermissionsService.name);

  /**
   * Dependencies:
   * - sharedPermissionsRepository: thao tác DB cho shared permissions.
   * - acl: AccessControlService, dùng để invalidate cache khi shared-permissions thay đổi.
   */
  constructor(
    private readonly sharedPermissionsRepository: SharedPermissionsRepository,
    private readonly acl: AccessControlService,
    private readonly _prisma: PrismaService,
  ) {}

  async getByCustomerAndCaregiver(
    customerId: string,
    caregiverId: string,
  ): Promise<SharedPermissions | null> {
    /**
     * Lấy SharedPermissions cho cặp (customerId, caregiverId).
     * - Trả về SharedPermissions nếu tồn tại.
     * - Ném NotFoundException nếu không tìm thấy.
     * Input validation: hàm giả định caller truyền đúng IDs (string non-empty).
     */
    try {
      this.logger.debug(
        `Getting shared permission for customer: ${customerId}, caregiver: ${caregiverId}`,
      );
      const record = await this.sharedPermissionsRepository.findByCustomerAndCaregiver(
        customerId,
        caregiverId,
      );

      if (!record) {
        this.logger.warn(
          `Shared permission not found for customer: ${customerId}, caregiver: ${caregiverId}`,
        );
        throw new NotFoundException('Shared permission not found');
      }

      this.logger.debug(
        `Shared permission found for customer: ${customerId}, caregiver: ${caregiverId}`,
      );
      return this.mapToSharedPermissions(record);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Failed to get shared permission for customer: ${customerId}, caregiver: ${caregiverId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  async getById(id: string): Promise<SharedPermissions | null> {
    /**
     * Lấy shared-permissions theo id của record (permission id).
     * - Trả về null nếu không tìm thấy (không ném lỗi).
     */
    try {
      this.logger.debug(`Getting shared permission by ID: ${id}`);
      const record = await this.sharedPermissionsRepository.findByPermissionId(id);

      if (!record) {
        this.logger.debug(`Shared permission not found: ${id}`);
        return null;
      }

      const result = this.mapToSharedPermissions(record);
      this.logger.debug(`Retrieved shared permission by ID: ${id}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to get shared permission by ID: ${id}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  async update(customerId: string, caregiverId: string, raw: unknown): Promise<SharedPermissions> {
    /**
     * Upsert shared-permissions cho cặp customer/caregiver.
     * Steps:
     *  1. Accepts raw input (có thể là object hoặc { permissions: {...} } từ frontend).
     *  2. Validate với validateSharedPermissions và normalize (hỗ trợ colon/underscore keys).
     *  3. Ghi vào DB (upsert).
     *  4. Invalidate cache trong AccessControlService cho cặp (caregiverId:customerId).
     *
     * Errors:
     *  - BadRequestException nếu payload invalid.
     */
    try {
      this.logger.log(
        `Updating shared permissions for customer: ${customerId}, caregiver: ${caregiverId}`,
      );
      this.logger.log(`[INPUT RAW] raw: ${JSON.stringify(raw)}`);

      // Handle nested permissions structure from frontend
      let permissionsData = raw;
      if (typeof raw === 'object' && raw !== null && 'permissions' in raw) {
        // Extract permissions from nested structure
        permissionsData = (raw as any).permissions;
        this.logger.debug('Extracted permissions from nested structure');
      }

      const { valid, errors } = validateSharedPermissions(permissionsData);
      if (!valid) {
        this.logger.warn(`Invalid shared permissions: ${errors.join(', ')}`);
        throw new BadRequestException(`Invalid access_grants: ${errors.join(', ')}`);
      }

      const normalized = normalizeSharedPermissions(permissionsData);
      if (!normalized) {
        this.logger.warn('Unable to normalize shared permissions');
        throw new BadRequestException(`Unable to normalize access_grants`);
      }

      const result = await this.sharedPermissionsRepository.upsert(
        customerId,
        caregiverId,
        normalized,
      );

      // Invalidate ACL/cache for this pair so changes take effect immediately
      try {
        this.acl.invalidatePair(caregiverId, customerId);
      } catch (err) {
        // Invalidating cache không phải là lỗi fatal cho DB update -> chỉ log
        this.logger.warn(
          `Failed to invalidate ACL cache for ${caregiverId}:${customerId} after update: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }

      this.logger.log(
        `Shared permissions updated successfully for customer: ${customerId}, caregiver: ${caregiverId}`,
      );
      return this.mapToSharedPermissions(result);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        `Failed to update shared permissions for customer: ${customerId}, caregiver: ${caregiverId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  async remove(customerId: string, caregiverId: string): Promise<{ message: string }> {
    /**
     * Xóa shared permissions cho cặp.
     * - Nếu không tồn tại -> NotFoundException.
     * - Sau khi xóa, invalidate cache cho cặp để các truy vấn tiếp theo không đọc data cũ.
     */
    try {
      this.logger.log(
        `Removing shared permissions for customer: ${customerId}, caregiver: ${caregiverId}`,
      );
      const result = await this.sharedPermissionsRepository.deletePermission(
        customerId,
        caregiverId,
      );

      if (!result) {
        this.logger.warn(
          `No shared permission record found to delete for customer: ${customerId}, caregiver: ${caregiverId}`,
        );
        throw new NotFoundException('Không tìm thấy bản ghi để xóa');
      }

      // Invalidate ACL/cache for this pair so deletion take effect immediately
      try {
        this.acl.invalidatePair(caregiverId, customerId);
      } catch (err) {
        this.logger.warn(
          `Failed to invalidate ACL cache for ${caregiverId}:${customerId} after delete: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }

      this.logger.log(
        `Shared permissions removed successfully for customer: ${customerId}, caregiver: ${caregiverId}`,
      );
      return { message: 'Xóa shared permissions thành công' };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Failed to remove shared permissions for customer: ${customerId}, caregiver: ${caregiverId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  async getAllForCaregiver(caregiverId: string): Promise<any[]> {
    try {
      this.logger.debug(`Getting all shared permissions for caregiver: ${caregiverId}`);
      const records = await this.sharedPermissionsRepository.findByCaregiver(caregiverId);

      const result = records.map((r) => ({
        caregiver_id: r.caregiver_id,
        customer_id: r.customer_id,
        customer_username: r.users_shared_permissions_customer_idTousers?.email ?? null,
        customer_full_name: r.users_shared_permissions_customer_idTousers?.full_name ?? null,
        ...this.mapToSharedPermissions(r),
      }));

      this.logger.debug(
        `Retrieved ${records.length} shared permissions for caregiver: ${caregiverId}`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to get shared permissions for caregiver: ${caregiverId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  async getAllByCustomer(customerId: string): Promise<any[]> {
    try {
      this.logger.debug(`Getting all shared permissions for customer: ${customerId}`);

      const records = await this.sharedPermissionsRepository.findByCustomer(customerId);

      this.logger.debug(`Raw query returned ${records.length} records for customer: ${customerId}`);

      // Log từng record để debug
      records.forEach((record, index) => {
        this.logger.debug(
          `Record ${index}: customer_id=${record.customer_id}, caregiver_id=${record.caregiver_id}, caregiver=${record.users_shared_permissions_caregiver_idTousers?.email || 'null'}`,
        );
      });

      const result = records.map((r) => ({
        customer_id: r.customer_id,
        caregiver_id: r.caregiver_id,
        caregiver_username: r.users_shared_permissions_caregiver_idTousers?.email ?? null,
        caregiver_full_name: r.users_shared_permissions_caregiver_idTousers?.full_name ?? null,
        ...this.mapToSharedPermissions(r),
      }));

      this.logger.debug(
        `Retrieved ${records.length} shared permissions for customer: ${customerId}`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to get shared permissions for customer: ${customerId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  private mapToSharedPermissions(record: any): SharedPermissions {
    // Map DB record (snake_case) sang object shared-permissions dùng trong toàn project.
    // Chú ý: giữ dạng colon-style keys cho tương thích với callers cũ.
    return {
      'stream:view': record.stream_view,
      'alert:read': record.alert_read,
      'alert:ack': record.alert_ack,
      'profile:view': record.profile_view,
      log_access_days: record.log_access_days,
      report_access_days: record.report_access_days,
      notification_channel: record.notification_channel,
    };
  }

  async checkPermission(
    caregiverId: string,
    customerId: string,
    permission: keyof SharedPermissions,
  ): Promise<boolean> {
    try {
      this.logger.debug(
        `Checking permission '${permission}' for caregiver: ${caregiverId}, customer: ${customerId}`,
      );
      const record = await this.sharedPermissionsRepository.findByCustomerAndCaregiver(
        customerId,
        caregiverId,
      );

      if (!record) {
        this.logger.debug(
          `No shared permission record found for caregiver: ${caregiverId}, customer: ${customerId}`,
        );
        return false;
      }

      const mapped = this.mapToSharedPermissions(record);
      const hasPermission = Boolean(mapped[permission]);

      this.logger.debug(
        `Permission '${permission}' check result: ${hasPermission} for caregiver: ${caregiverId}, customer: ${customerId}`,
      );
      return hasPermission;
    } catch (error) {
      this.logger.error(
        `Failed to check permission '${permission}' for caregiver: ${caregiverId}, customer: ${customerId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  async getReportAccessDays(customerId: string, caregiverId: string): Promise<number> {
    const record = await this.sharedPermissionsRepository.findByCustomerAndCaregiver(
      customerId,
      caregiverId,
    );
    if (!record) return 0;
    return record.report_access_days ?? 0;
  }

  async getLogAccessDays(customerId: string, caregiverId: string): Promise<number> {
    const record = await this.sharedPermissionsRepository.findByCustomerAndCaregiver(
      customerId,
      caregiverId,
    );
    if (!record) return 0;
    return record.log_access_days ?? 0;
  }

  async getCaregiversOfCustomer(customerId: string): Promise<{ user_id: string }[]> {
    const caregiversFromShared = await this._prisma.access_grants.findMany({
      where: { customer_id: customerId },
      select: { caregiver_id: true },
    });

    const caregiversFromAssignment = await this._prisma.caregiver_invitations.findMany({
      where: { customer_id: customerId, status: 'accepted' },
      select: { caregiver_id: true },
    });

    const allIds = [...caregiversFromShared, ...caregiversFromAssignment].map(
      (c) => c.caregiver_id,
    );

    const uniqueIds = Array.from(new Set(allIds));
    return uniqueIds.map((user_id) => ({ user_id }));
  }
}
