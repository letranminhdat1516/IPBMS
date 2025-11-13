import { Injectable } from '@nestjs/common';
import { isValidUuid } from '../../../shared/utils/uuid.util';
import { createBadRequestException } from '../../../shared/utils';
import { PrismaService } from '../../database/prisma.service';
import { UnitOfWork } from '../../database/unit-of-work.service';
import { BasePrismaRepository } from '../shared/base-prisma.repository';

@Injectable()
export class SharedPermissionsRepository extends BasePrismaRepository {
  constructor(prismaService: PrismaService, unitOfWork: UnitOfWork) {
    super(prismaService, unitOfWork);
  }

  /**
   * Find by customer and caregiver IDs
   */
  async findByCustomerAndCaregiver(customerId: string, caregiverId: string): Promise<any | null> {
    if (!isValidUuid(customerId) || !isValidUuid(caregiverId)) return null;
    return await this.prismaService.access_grants.findFirst({
      where: {
        customer_id: customerId,
        caregiver_id: caregiverId,
      },
    });
  }

  /**
   * Find by ID
   */
  async findByPermissionId(id: string): Promise<any | null> {
    return await this.prismaService.access_grants.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            user_id: true,
            full_name: true,
            email: true,
          },
        },
        caregiver: {
          select: {
            user_id: true,
            full_name: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Create or update shared permission
   */
  async upsert(customerId: string, caregiverId: string, permissions: any): Promise<any> {
    // Check if record exists first
    if (!isValidUuid(customerId) || !isValidUuid(caregiverId)) {
      throw createBadRequestException('UUID không hợp lệ cho customerId hoặc caregiverId');
    }
    const existing = await this.findByCustomerAndCaregiver(customerId, caregiverId);

    if (existing) {
      // Update existing record
      return await this.prismaService.access_grants.update({
        where: { id: existing.id },
        data: {
          stream_view: permissions.stream_view || false,
          alert_read: permissions.alert_read || false,
          alert_ack: permissions.alert_ack || false,
          profile_view: permissions.profile_view || false,
          log_access_days: permissions.log_access_days || 0,
          report_access_days: permissions.report_access_days || 0,
          notification_channel: permissions.notification_channel || [],
          updated_at: new Date(),
        },
      });
    } else {
      // Create new record
      return await this.prismaService.access_grants.create({
        data: {
          customer_id: customerId,
          caregiver_id: caregiverId,
          stream_view: permissions.stream_view || false,
          alert_read: permissions.alert_read || false,
          alert_ack: permissions.alert_ack || false,
          profile_view: permissions.profile_view || false,
          log_access_days: permissions.log_access_days || 0,
          report_access_days: permissions.report_access_days || 0,
          notification_channel: permissions.notification_channel || [],
        },
      });
    }
  }

  /**
   * Delete shared permission
   */
  async deletePermission(customerId: string, caregiverId: string): Promise<any> {
    if (!isValidUuid(customerId) || !isValidUuid(caregiverId)) return null;
    const existing = await this.findByCustomerAndCaregiver(customerId, caregiverId);
    if (existing) {
      return await this.prismaService.access_grants.delete({
        where: { id: existing.id },
      });
    }
    return null;
  }

  /**
   * Check if permission exists
   */
  async permissionExists(customerId: string, caregiverId: string): Promise<boolean> {
    if (!isValidUuid(customerId) || !isValidUuid(caregiverId)) return false;
    const count = await this.prismaService.access_grants.count({
      where: {
        customer_id: customerId,
        caregiver_id: caregiverId,
      },
    });
    return count > 0;
  }

  /**
   * Find all permissions for a customer
   */
  async findByCustomer(customerId: string): Promise<any[]> {
    if (!isValidUuid(customerId)) return [];
    return await this.prismaService.access_grants.findMany({
      where: { customer_id: customerId },
      include: {
        caregiver: {
          select: {
            user_id: true,
            full_name: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Find all permissions for a caregiver
   */
  async findByCaregiver(caregiverId: string): Promise<any[]> {
    if (!isValidUuid(caregiverId)) return [];
    return await this.prismaService.access_grants.findMany({
      where: { caregiver_id: caregiverId },
      include: {
        customer: {
          select: {
            user_id: true,
            full_name: true,
            email: true,
          },
        },
      },
    });
  }

  async createEmpty(customerId: string, caregiverId: string) {
    if (!isValidUuid(customerId) || !isValidUuid(caregiverId)) {
      throw createBadRequestException('UUID không hợp lệ cho customerId hoặc caregiverId');
    }
    return this.prismaService.access_grants.create({
      data: {
        customer_id: customerId,
        caregiver_id: caregiverId,
        stream_view: false,
        alert_read: false,
        alert_ack: false,
        profile_view: false,
        log_access_days: 0,
        report_access_days: 0,
        notification_channel: [],
        permission_requests: [],
        permission_scopes: {},
      },
    });
  }

  async updateJson(customerId: string, caregiverId: string, data: any) {
    const existing = await this.findByCustomerAndCaregiver(customerId, caregiverId);
    if (!existing) throw new Error('shared_permissions not found');
    return this.updateById(existing.id, data);
  }

  async updateById(id: string, data: any) {
    return this.prismaService.access_grants.update({ where: { id }, data });
  }

  async findByRequestId(reqId: string) {
    const rows = await this.prismaService.access_grants.findMany();
    return rows.find(
      (r: any) =>
        Array.isArray(r.permission_requests) &&
        r.permission_requests.some((x: any) => x.id === reqId),
    );
  }
  async findByRequestIdForCustomer(reqId: string, customerId: string) {
    const rows = await this.prismaService.access_grants.findMany({
      where: { customer_id: customerId },
      select: { id: true, customer_id: true, permission_requests: true },
    });
    return rows.find(
      (r) =>
        Array.isArray(r.permission_requests) &&
        r.permission_requests.some((x: any) => x.id === reqId),
    );
  }
  async findByRequestIdForCaregiver(reqId: string, caregiverId: string) {
    const rows = await this.prismaService.access_grants.findMany({
      where: { caregiver_id: caregiverId },
      select: { id: true, customer_id: true, caregiver_id: true, permission_requests: true },
    });
    return (
      rows.find(
        (r) =>
          Array.isArray(r.permission_requests) &&
          r.permission_requests.some((x: any) => String(x?.id) === String(reqId)),
      ) ?? null
    );
  }
}
