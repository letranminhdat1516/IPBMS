import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { UnitOfWork } from '../../database/unit-of-work.service';

const PRIMARY_KEYS: Record<string, string> = {
  users: 'user_id',
  cameras: 'camera_id',
  alerts: 'alert_id',
  caregiver_invitations: 'assignment_id',
  events: 'event_id',
  device_tokens: 'token_id',
  notifications: 'notification_id',
  patient_habits: 'habit_id',
  patient_medical_histories: 'id',
  patient_supplements: 'id',
  payments: 'payment_id',
  plans: 'code',
  access_grants: 'id',
  snapshot_files: 'image_id',
  snapshots: 'snapshot_id',
  subscriptions: 'subscription_id',
  subscription_histories: 'id',
  system_config: 'setting_id',
  support_tickets: 'ticket_id',
  transactions: 'tx_id',
  user_roles: 'user_id',
  user_preferences: 'id',

  activity_logs: 'id',
  roles: 'id',
  permissions: 'id',
  role_permissions: 'role_id',
};

@Injectable()
export abstract class BasePrismaRepository {
  protected prisma: PrismaClient;
  protected unitOfWork: UnitOfWork;
  private static readonly baseLogger = new Logger(BasePrismaRepository.name);

  constructor(
    protected readonly prismaService: PrismaService,
    protected readonly _unitOfWork: UnitOfWork,
  ) {
    this.prisma = prismaService as unknown as PrismaClient;
    this.unitOfWork = _unitOfWork;
  }

  private getPrimaryKey(model: string): string {
    return PRIMARY_KEYS[model] || 'id';
  }

  /**
   * Chuẩn hoá filter Mongo-style -> Prisma-style
   */
  private normalizeWhere(where: any): any {
    if (!where) return where;
    const clone = { ...where };

    for (const key of Object.keys(clone)) {
      const val = clone[key];
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        clone[key] = this.normalizeWhere(val);
      }
      if (key.startsWith('$')) {
        const newKey = key.replace('$', '');
        clone[newKey] = val;
        delete clone[key];
      }
    }

    return clone;
  }

  protected async findById<T>(
    model: keyof PrismaClient,
    id: string,
    include?: any,
  ): Promise<T | null> {
    const pk = this.getPrimaryKey(model as string);
    // quick sanity checks: avoid passing clearly invalid UUID strings to Prisma
    if (!id) return null;

    const isUuidPk = pk.endsWith('_id');
    const uuidRegex = /^(urn:uuid:)?[0-9a-fA-F-]{36}$/;
    if (isUuidPk && typeof id === 'string' && !uuidRegex.test(id)) {
      BasePrismaRepository.baseLogger.warn(
        `findById called with invalid UUID-like pk for model=${String(model)} pk=${pk} id=${id}`,
      );
      // return null so callers can handle not-found gracefully instead of crashing
      return null;
    }

    try {
      return (this.prisma[model] as any).findUnique({
        where: { [pk]: id },
        include,
      });
    } catch (err: any) {
      // Log detailed context for easier debugging
      BasePrismaRepository.baseLogger.error(
        `Prisma error during findById model=${String(model)} pk=${pk} id=${id}`,
        err,
      );
      const msg = (err && (err.message || err.code)) || '';
      if (
        typeof msg === 'string' &&
        (msg.includes('Error creating UUID') ||
          msg.includes('Inconsistent column data') ||
          msg.includes('invalid character'))
      ) {
        // Malformed UUID or inconsistent column data — return null so caller treats as not-found
        BasePrismaRepository.baseLogger.warn(
          'Malformed UUID or inconsistent column data provided to Prisma; returning null',
        );
        return null;
      }
      throw err;
    }
  }

  protected async findManyByIds<T>(
    model: keyof PrismaClient,
    ids: string[],
    include?: any,
  ): Promise<T[]> {
    const pk = this.getPrimaryKey(model as string);
    return (this.prisma[model] as any).findMany({
      where: { [pk]: { in: ids } },
      include,
    });
  }

  protected async createRecord<T>(model: keyof PrismaClient, data: any): Promise<T> {
    return (this.prisma[model] as any).create({ data });
  }

  protected async updateRecord<T>(model: keyof PrismaClient, id: string, data: any): Promise<T> {
    const pk = this.getPrimaryKey(model as string);
    return (this.prisma[model] as any).update({
      where: { [pk]: id },
      data,
    });
  }

  protected async hardDelete<T>(model: keyof PrismaClient, id: string): Promise<T> {
    const pk = this.getPrimaryKey(model as string);
    return (this.prisma[model] as any).delete({
      where: { [pk]: id },
    });
  }

  protected async softDelete<T>(model: keyof PrismaClient, id: string): Promise<T> {
    const pk = this.getPrimaryKey(model as string);
    return (this.prisma[model] as any).update({
      where: { [pk]: id },
      data: { deleted_at: new Date() }, // chuẩn snake_case
    });
  }

  protected async exists(model: keyof PrismaClient, where: any): Promise<boolean> {
    const normalizedWhere = this.normalizeWhere(where);
    const count = await (this.prisma[model] as any).count({ where: normalizedWhere });
    return count > 0;
  }

  protected async count(model: keyof PrismaClient, where?: any): Promise<number> {
    const normalizedWhere = this.normalizeWhere(where);
    return (this.prisma[model] as any).count({ where: normalizedWhere });
  }

  protected async paginate<T>(
    model: keyof PrismaClient,
    options: {
      where?: any;
      include?: any;
      orderBy?: any;
      skip?: number;
      take?: number;
    } = {},
  ): Promise<{
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { where, include, orderBy, skip = 0, take = 10 } = options;
    const normalizedWhere = this.normalizeWhere(where);

    const [data, total] = await Promise.all([
      (this.prisma[model] as any).findMany({
        where: normalizedWhere,
        include,
        orderBy,
        skip,
        take,
      }),
      (this.prisma[model] as any).count({ where: normalizedWhere }),
    ]);

    const page = Math.floor(skip / take) + 1;
    const totalPages = Math.ceil(total / take);

    return {
      data,
      total,
      page,
      limit: take,
      totalPages,
    };
  }
}
