import { Injectable } from '@nestjs/common';
import { ActivityLog, ActivitySeverity } from '../../../core/entities/activity_logs.entity';
import { PrismaService } from '../../database/prisma.service';
import { UnitOfWork } from '../../database/unit-of-work.service';
import { UserPreferencesRepository } from '../users/user-preferences.repository';
import { BasePrismaRepository } from './base-prisma.repository';

@Injectable()
export class ActivityLogsRepository extends BasePrismaRepository {
  constructor(
    protected readonly prismaService: PrismaService,
    protected readonly _unitOfWork: UnitOfWork,
    private readonly userSettingsRepo: UserPreferencesRepository,
  ) {
    super(prismaService, _unitOfWork);
  }

  /**
   * 🛠️ Helper lấy setting (ưu tiên user override, fallback về system)
   */
  async getSetting(userId: string | null, category: string, key: string): Promise<string | null> {
    if (userId) {
      const userSetting = await this.userSettingsRepo.get(userId, category, key);
      if (userSetting && userSetting.is_overridden) {
        return userSetting.setting_value ?? null;
      }
    }
    const sys = await this.prisma.system_config.findFirst({
      where: {
        category,
        setting_key: key,
      },
    });
    return sys?.setting_value ?? null;
  }

  async getBoolean(userId: string | null, category: string, key: string): Promise<boolean> {
    const val = await this.getSetting(userId, category, key);
    return val === 'true' || val === '1';
  }

  async getInt(userId: string | null, category: string, key: string): Promise<number | null> {
    const val = await this.getSetting(userId, category, key);
    if (!val) return null;
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? null : parsed;
  }

  async getJson<T = any>(userId: string | null, category: string, key: string): Promise<T | null> {
    const val = await this.getSetting(userId, category, key);
    try {
      return val ? (JSON.parse(val) as T) : null;
    } catch {
      return null;
    }
  }

  // =============================================
  // Các hàm CRUD activity_logs giữ nguyên
  // =============================================

  async findByIdPublic(id: string): Promise<ActivityLog | null> {
    return super.findById<ActivityLog>('activity_logs', id);
  }

  async findAll(): Promise<ActivityLog[]> {
    const result = await super.paginate<ActivityLog>('activity_logs', { take: 1000 });
    return result.data as ActivityLog[];
  }

  async findByUserId(userId: string): Promise<ActivityLog[]> {
    const result = await super.paginate<ActivityLog>('activity_logs', {
      where: { actor_id: userId },
      take: 1000,
    });
    return result.data as ActivityLog[];
  }

  async findByUserIdWithLimit(userId: string, limit = 50): Promise<ActivityLog[]> {
    const result = await super.paginate<ActivityLog>('activity_logs', {
      where: { actor_id: userId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
    return result.data as ActivityLog[];
  }

  async create(data: any): Promise<ActivityLog> {
    const prismaData = { ...data };
    if (data.severity && typeof data.severity === 'string') {
      prismaData.severity = data.severity.toLowerCase() as any;
    }
    if (data.action_enum && typeof data.action_enum === 'string') {
      prismaData.action_enum = data.action_enum.toLowerCase() as any;
    }

    const result = await this.prisma.activity_logs.create({ data: prismaData });
    return this.convertPrismaToEntity(result);
  }

  async update(id: string, data: any): Promise<ActivityLog | null> {
    try {
      const prismaData = { ...data };
      if (data.severity && typeof data.severity === 'string') {
        prismaData.severity = data.severity.toLowerCase() as any;
      }
      if (data.action_enum && typeof data.action_enum === 'string') {
        prismaData.action_enum = data.action_enum.toLowerCase() as any;
      }

      const result = await this.prisma.activity_logs.update({
        where: { id },
        data: prismaData,
      });
      return this.convertPrismaToEntity(result);
    } catch {
      return null;
    }
  }

  async remove(id: string): Promise<void> {
    await this.prisma.activity_logs.delete({ where: { id } });
  }

  async findWithFilters(filters: {
    userId?: string;
    from?: Date;
    to?: Date;
    severity?: ActivitySeverity;
    action?: string;
  }): Promise<ActivityLog[]> {
    const where: any = {};
    if (filters.userId) where.actor_id = filters.userId;
    if (filters.from || filters.to) {
      where.created_at = {};
      if (filters.from) where.created_at.gte = filters.from;
      if (filters.to) where.created_at.lte = filters.to;
    }
    if (filters.severity) where.severity = filters.severity;
    if (filters.action) where.action = filters.action;

    const result = await super.paginate<ActivityLog>('activity_logs', {
      where,
      take: 10000,
      orderBy: { created_at: 'desc' },
    });

    return result.data as ActivityLog[];
  }

  private convertPrismaToEntity(prismaRecord: any): ActivityLog {
    const entity = { ...prismaRecord };
    if (prismaRecord.severity) {
      entity.severity = prismaRecord.severity.toUpperCase() as ActivitySeverity;
    }
    if (prismaRecord.action_enum) {
      entity.action_enum = prismaRecord.action_enum.toUpperCase() as any;
    }
    return entity as ActivityLog;
  }

  async deleteOlderThan(options: { normalDays: number; abnormalDays: number }): Promise<number> {
    const now = new Date();
    const cutoffNormal = new Date(now.getTime() - options.normalDays * 24 * 60 * 60 * 1000);
    const cutoffAbnormal = new Date(now.getTime() - options.abnormalDays * 24 * 60 * 60 * 1000);

    const result = await this.prisma.activity_logs.deleteMany({
      where: {
        OR: [
          {
            severity: { in: ['info', 'low', 'medium'] },
            timestamp: { lt: cutoffNormal },
          },
          {
            severity: { in: ['high', 'critical'] },
            timestamp: { lt: cutoffAbnormal },
          },
        ],
      },
    });
    return result.count;
  }

  async findByUserIds(userIds: string[]): Promise<ActivityLog[]> {
    const result = await this.prisma.activity_logs.findMany({
      where: { actor_id: { in: userIds } },
      orderBy: { timestamp: 'desc' },
    });
    return result.map(this.convertPrismaToEntity);
  }

  async findFeedbackAboutCaregiver(caregiverId: string): Promise<ActivityLog[]> {
    return this.prisma.activity_logs
      .findMany({
        where: {
          meta: {
            path: ['caregiver_id'],
            equals: caregiverId,
          },
          actor_id: {
            not: caregiverId, // phản hồi từ người khác
          },
        },
        orderBy: { timestamp: 'desc' },
      })
      .then((results) => results.map(this.convertPrismaToEntity));
  }
  async findLogs(params: { actorIds: string[]; actorName?: string }): Promise<ActivityLog[]> {
    const where: any = { actor_id: { in: params.actorIds } };

    if (params.actorName?.trim()) {
      // Prisma: dùng contains + mode: 'insensitive' để tương đương ILIKE
      where.actor_name = {
        contains: params.actorName.trim(),
        mode: 'insensitive',
      };
    }

    const result = await super.paginate<ActivityLog>('activity_logs', {
      where,
      orderBy: { timestamp: 'desc' },
      take: 500,
    });

    return result.data as ActivityLog[];
  }
}
