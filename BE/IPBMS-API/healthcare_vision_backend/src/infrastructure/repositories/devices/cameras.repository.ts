import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { parseISOToDate } from '../../../shared/utils';
import { Camera } from '../../../core/entities/cameras.entity';
import { PrismaService } from '../../database/prisma.service';
import { UnitOfWork } from '../../database/unit-of-work.service';
import { BasePrismaRepository } from '../shared/base-prisma.repository';

@Injectable()
export class CamerasRepository extends BasePrismaRepository {
  constructor(
    protected readonly prismaService: PrismaService,
    protected readonly _unitOfWork: UnitOfWork,
  ) {
    super(prismaService, _unitOfWork);
  }

  // Basic CRUD operations
  async findCameraById(camera_id: string): Promise<Camera | null> {
    return super.findById<Camera>('cameras', camera_id);
  }

  async validateUserExists(user_id: string): Promise<boolean> {
    const user = await this.prisma.users.findUnique({
      where: { user_id },
      select: { user_id: true },
    });
    return !!user;
  }

  async findAllCameras(): Promise<Camera[]> {
    const result = await super.paginate<Camera>('cameras', { take: 1000 });
    return result.data as Camera[];
  }

  async findCamerasByIds(ids: string[]): Promise<Camera[]> {
    return super.findManyByIds<Camera>('cameras', ids);
  }

  async createCamera(data: Partial<Camera>): Promise<Camera> {
    return super.createRecord<Camera>('cameras', data);
  }

  async updateCamera(camera_id: string, data: Partial<Camera>): Promise<Camera | null> {
    return super.updateRecord<Camera>('cameras', camera_id, data);
  }

  async removeCamera(camera_id: string): Promise<{ deleted: boolean }> {
    try {
      await super.hardDelete<Camera>('cameras', camera_id);
      return { deleted: true };
    } catch {
      return { deleted: false };
    }
  }

  async softDeleteCamera(camera_id: string): Promise<{ deleted: boolean }> {
    try {
      await this.prisma.cameras.update({
        where: { camera_id },
        data: { status: 'inactive' },
      });
      return { deleted: true };
    } catch {
      return { deleted: false };
    }
  }

  // Custom queries moved from service
  async listCamerasByUserId(
    user_id: string,
    params?: { page?: number; limit?: number },
  ): Promise<{ data: Camera[]; total: number; page: number; limit: number }> {
    const page = params?.page && params.page > 0 ? params.page : 1;
    const limit = params?.limit && params.limit > 0 ? params.limit : 20;

    // First, try to find cameras that belong directly to the user
    // Additionally, if the user is a caregiver, include cameras that belong
    // to customers assigned to this caregiver (caregiver_invitations.customer_id)

    // Get active assignments where this user is the caregiver
    const assignments = await this.prisma.caregiver_invitations.findMany({
      where: { caregiver_id: user_id, is_active: true },
      select: { customer_id: true },
    });

    const customerIds = assignments.map((a) => a.customer_id).filter(Boolean);

    const whereClause: Prisma.camerasWhereInput = customerIds.length
      ? {
          OR: [{ user_id }, { user_id: { in: customerIds } }],
        }
      : { user_id };

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.cameras.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.cameras.count({ where: whereClause }),
    ]);

    return { data: data as Camera[], total, page, limit };
  }

  /**
   * Count cameras that belong to a user (including customers assigned to caregiver)
   */
  async countByUserId(user_id: string): Promise<number> {
    const assignments = await this.prisma.caregiver_invitations.findMany({
      where: { caregiver_id: user_id, is_active: true },
      select: { customer_id: true },
    });
    const customerIds = assignments.map((a) => a.customer_id).filter(Boolean);

    const whereClause: Prisma.camerasWhereInput = customerIds.length
      ? {
          OR: [{ user_id }, { user_id: { in: customerIds } }],
        }
      : { user_id };

    return this.prisma.cameras.count({ where: whereClause });
  }

  /**
   * Count active cameras for a user.
   * "Active" follows the UI definition for "Camera đang dùng": cameras currently in use.
   * By default we treat a camera as active when `is_online = true`.
   */
  async countActiveByUserId(user_id: string): Promise<number> {
    const assignments = await this.prisma.caregiver_invitations.findMany({
      where: { caregiver_id: user_id, is_active: true },
      select: { customer_id: true },
    });
    const customerIds = assignments.map((a) => a.customer_id).filter(Boolean);

    // Only consider cameras with is_online = true as active (matches UI "in use" metric)
    const whereClause: Prisma.camerasWhereInput = customerIds.length
      ? { AND: [{ OR: [{ user_id }, { user_id: { in: customerIds } }] }, { is_online: true }] }
      : { AND: [{ user_id }, { is_online: true }] };

    return this.prisma.cameras.count({ where: whereClause });
  }

  /**
   * Count cameras grouped by owner user_id for a list of user IDs.
   * Returns a map: { [user_id]: count }
   */
  async countByUserIds(userIds: string[]): Promise<Record<string, number>> {
    if (!Array.isArray(userIds) || userIds.length === 0) return {};
    const rows: any[] = await this.prisma.cameras.groupBy({
      by: ['user_id'],
      where: { user_id: { in: userIds } },
      _count: { _all: true },
    } as any);
    const map: Record<string, number> = {};
    for (const r of rows) map[r.user_id] = Number(r._count?._all ?? 0);
    return map;
  }

  /**
   * Count active cameras grouped by owner user_id for a list of user IDs.
   * Active = is_online = true.
   */
  async countActiveByUserIds(userIds: string[]): Promise<Record<string, number>> {
    if (!Array.isArray(userIds) || userIds.length === 0) return {};
    const rows: any[] = await this.prisma.cameras.groupBy({
      by: ['user_id'],
      where: { user_id: { in: userIds }, is_online: true },
      _count: { _all: true },
    } as any);
    const map: Record<string, number> = {};
    for (const r of rows) map[r.user_id] = Number(r._count?._all ?? 0);
    return map;
  }

  async listCameras(params: {
    page?: number;
    limit?: number;
    reportedOnly?: boolean;
  }): Promise<{ data: Camera[]; total: number; page: number; limit: number }> {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 20;

    if (params.reportedOnly) {
      // Cameras that have at least one event
      return super.paginate<Camera>('cameras', {
        where: {
          events: {
            some: {},
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { created_at: 'desc' },
      });
    }

    return super.paginate<Camera>('cameras', {
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { created_at: 'desc' },
    });
  }

  async listEvents(
    camera_id: string,
    params: {
      page?: number;
      limit?: number;
      dateFrom?: string;
      dateTo?: string;
      status?: string[];
      type?: string[];
      severity?: Array<'low' | 'medium' | 'high' | 'critical'>;
      orderBy?: 'detected_at' | 'confidence_score';
      order?: 'ASC' | 'DESC';
    },
  ): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? Math.min(params.limit, 200) : 50;
    const offset = (page - 1) * limit;

    const where: Prisma.eventsWhereInput = {
      camera_id,
    };

    const dateFilter: { gte?: Date; lte?: Date } = {};

    if (params.dateFrom) {
      const d = parseISOToDate(params.dateFrom);
      if (d) dateFilter.gte = d;
    }
    if (params.dateTo) {
      const d = parseISOToDate(params.dateTo);
      if (d) dateFilter.lte = d;
    }

    if (Object.keys(dateFilter).length > 0) {
      where.detected_at = dateFilter;
    }
    if (params.type && params.type.length) {
      where.event_type = { in: params.type as any };
    }
    if (params.status && params.status.length) {
      where.status = { in: params.status as any };
    }
    if (params.severity && params.severity.length) {
      where.ai_analysis_result = {
        path: ['severity'],
        string_contains: params.severity.join(','),
      };
    }

    const orderBy: Prisma.eventsOrderByWithRelationInput = {};
    const orderByField = params.orderBy || 'detected_at';
    const order = params.order === 'ASC' ? 'asc' : 'desc';

    if (orderByField === 'detected_at') {
      orderBy.detected_at = order;
    } else if (orderByField === 'confidence_score') {
      orderBy.confidence_score = order;
    }

    const [data, total] = await Promise.all([
      this.prisma.events.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy,
      }),
      this.prisma.events.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  /**
   * Return recent event issues for a camera. Kept minimal: returns last 50 events.
   */
  async getCameraIssues(camera_id: string, limit: number = 50) {
    const events = await this.prisma.events.findMany({
      where: { camera_id },
      orderBy: { detected_at: 'desc' },
      take: limit,
    });
    return events;
  }

  async checkCameraQuota(_user_id: string): Promise<void> {
    // This would need to be implemented based on the quota system
    // Implementation depends on how quota is stored and checked
  }

  // Service interface methods
  async listByUserId(
    user_id: string,
    params?: { page?: number; limit?: number },
  ): Promise<{ data: Camera[]; total: number; page: number; limit: number }> {
    return this.listCamerasByUserId(user_id, params);
  }

  async list(params: {
    page?: number;
    limit?: number;
    reportedOnly?: boolean;
  }): Promise<{ data: Camera[]; total: number; page: number; limit: number }> {
    return this.listCameras(params);
  }

  async findCameraByIdPublic(camera_id: string): Promise<Camera | null> {
    return this.findCameraById(camera_id);
  }

  async remove(camera_id: string): Promise<{ deleted: boolean }> {
    return this.removeCamera(camera_id);
  }
}
