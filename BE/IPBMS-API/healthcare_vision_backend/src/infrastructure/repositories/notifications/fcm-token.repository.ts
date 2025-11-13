import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { FcmToken, PushPlatformEnum } from '../../../core/entities/fcm-token.entity';
import { PrismaService } from '../../database/prisma.service';
import { UnitOfWork } from '../../database/unit-of-work.service';
import { BasePrismaRepository } from '../shared/base-prisma.repository';

@Injectable()
export class FcmTokenRepository extends BasePrismaRepository {
  constructor(
    protected readonly prismaService: PrismaService,
    protected readonly _unitOfWork: UnitOfWork,
  ) {
    super(prismaService, _unitOfWork);
  }

  async createFcmToken(data: Partial<FcmToken>): Promise<FcmToken> {
    try {
      const result = await this.prisma.device_tokens.create({
        data: {
          user_id: data.user_id!,
          token: data.token!,
          platform: data.platform! as any, // Cast to Prisma enum
          device_id: data.device_id,
          is_active: true,
          last_used_at: new Date(),
        },
      });

      // Convert back to entity format
      return this.convertPrismaToEntity(result);
    } catch (err: any) {
      // Handle unique constraint failures (token already exists). Convert to update.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        // Attempt to find existing token by unique token field and update it
        if (data.token) {
          const existing = await this.prisma.device_tokens.findUnique({
            where: { token: data.token },
          });
          if (existing) {
            const updated = await this.prisma.device_tokens.update({
              where: { token: data.token },
              data: {
                user_id: data.user_id ?? existing.user_id,
                device_id: data.device_id ?? existing.device_id,
                is_active: true,
                platform: data.platform ?? existing.platform,
                last_used_at: new Date(),
              },
            });
            return this.convertPrismaToEntity(updated);
          }
        }
      }
      throw err;
    }
  }

  async findOneFcmToken(where: Partial<FcmToken>): Promise<FcmToken | null> {
    const result = await super.paginate<FcmToken>('device_tokens', {
      where,
      take: 1,
    });
    return result.data.length > 0 ? result.data[0] : null;
  }

  async findFcmTokens(where?: Partial<FcmToken>): Promise<FcmToken[]> {
    const result = await super.paginate<FcmToken>('device_tokens', {
      where,
      take: 1000,
    });
    return result.data as FcmToken[];
  }

  async updateFcmToken(
    where: Partial<FcmToken>,
    data: Partial<FcmToken>,
  ): Promise<FcmToken | null> {
    const existingToken = await this.findOneFcmToken(where);
    if (!existingToken || !existingToken.id) return null;

    const result = await super.updateRecord<FcmToken>('device_tokens', existingToken.id, data);
    return result ? this.convertPrismaToEntity(result) : null;
  }

  async deleteFcmToken(where: Partial<FcmToken>): Promise<boolean> {
    try {
      const existingToken = await this.findOneFcmToken(where);
      if (!existingToken || !existingToken.id) return false;

      await super.hardDelete<FcmToken>('device_tokens', existingToken.id);
      return true;
    } catch {
      return false;
    }
  }

  async findFcmTokensByUserId(userId: string): Promise<FcmToken[]> {
    const result = await super.paginate<FcmToken>('device_tokens', {
      where: { user_id: userId },
      take: 1000,
    });
    return result.data as FcmToken[];
  }

  async findActiveFcmTokensByUserId(userId: string): Promise<FcmToken[]> {
    const result = await super.paginate<FcmToken>('device_tokens', {
      where: {
        user_id: userId,
        is_active: true,
      },
      orderBy: { last_used_at: 'desc' },
      take: 1000,
    });
    return result.data as FcmToken[];
  }

  async deactivateFcmToken(tokenId: string): Promise<FcmToken | null> {
    return super.updateRecord<FcmToken>('device_tokens', tokenId, { is_active: false });
  }

  async deactivateAllFcmTokensByUserId(userId: string): Promise<number> {
    const result = await this.prisma.device_tokens.updateMany({
      where: { user_id: userId },
      data: { is_active: false },
    });
    return result.count;
  }

  /** Dùng cho ACL/check nhanh trong controller */
  async getFcmTokenOwnerUserId(token_id: string): Promise<string | null> {
    const token = await this.prisma.device_tokens.findUnique({
      where: { token_id },
      select: { user_id: true },
    });
    return token?.user_id ?? null;
  }

  private convertPrismaToEntity(prismaRecord: any): FcmToken {
    const entity = { ...prismaRecord };

    // Convert Prisma enum values back to entity enum values
    if (prismaRecord.platform) {
      entity.platform = prismaRecord.platform as PushPlatformEnum;
    }

    return entity as FcmToken;
  }

  // Methods for cleanup scheduler
  async deleteOldInactiveTokens(daysAgo: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysAgo);

    const result = await this.prisma.device_tokens.deleteMany({
      where: {
        last_used_at: { lt: cutoffDate },
        is_active: false,
      },
    });
    return result.count;
  }

  async deactivateOldTokens(daysAgo: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysAgo);

    const result = await this.prisma.device_tokens.updateMany({
      where: {
        last_used_at: { lt: cutoffDate },
        is_active: true,
      },
      data: { is_active: false },
    });
    return result.count;
  }

  async countActiveTokens(): Promise<number> {
    return this.prisma.device_tokens.count({ where: { is_active: true } });
  }

  async countInactiveTokens(): Promise<number> {
    return this.prisma.device_tokens.count({ where: { is_active: false } });
  }

  async getPlatformStats(): Promise<Array<{ platform: string; count: number }>> {
    const result = await this.prisma.device_tokens.groupBy({
      by: ['platform'],
      where: { is_active: true },
      _count: { platform: true },
    });

    return result.map((item) => ({
      platform: item.platform,
      count: item._count.platform,
    }));
  }

  // Methods for FCM Core Service - complex queries that need raw access
  async findTokensByUserIds(
    userIds: string[],
    options?: {
      audiences?: string[];
      platform?: PushPlatformEnum;
      activeOnly?: boolean;
    },
  ): Promise<FcmToken[]> {
    if (!userIds?.length) return [];

    const where: any = {
      user_id: { in: userIds },
    };

    if (options?.platform) {
      where.platform = options.platform;
    }

    if (options?.activeOnly) {
      where.is_active = true;
    }

    // For audience filtering, we need to use raw SQL since Prisma doesn't have great JSON query support
    if (options?.audiences?.length) {
      // Build safe SQL conditions
      const userIdPlaceholders = userIds.map((_, index) => `$${index + 1}`).join(',');
      let queryConditions = `user_id IN (${userIdPlaceholders})`;
      let paramIndex = userIds.length + 1;
      const queryParams: any[] = [...userIds];

      if (options.platform) {
        queryConditions += ` AND platform = $${paramIndex}`;
        queryParams.push(options.platform);
        paramIndex++;
      }

      if (options.activeOnly) {
        queryConditions += ` AND is_active = true`;
      }

      // Add audience conditions
      const audienceConditions = options.audiences
        .map(() => {
          const condition = `topics->>'audience' = $${paramIndex}`;
          paramIndex++;
          return condition;
        })
        .join(' OR ');

      queryConditions += ` AND (${audienceConditions})`;
      queryParams.push(...options.audiences);

      // Use parameterized query for safety
      const results = await this.prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM device_tokens WHERE ${queryConditions}`,
        ...queryParams,
      );

      return results.map((result) => this.convertPrismaToEntity(result));
    }

    const results = await this.prisma.device_tokens.findMany({
      where,
    });

    return results.map((result) => this.convertPrismaToEntity(result));
  }

  async updateTokensAsInactive(tokens: string[]): Promise<number> {
    if (!tokens?.length) return 0;

    const result = await this.prisma.device_tokens.updateMany({
      where: {
        token: { in: tokens },
      },
      data: {
        is_active: false,
        revoked_at: new Date(),
      },
    });

    return result.count;
  }

  async updateTokensLastUsed(tokens: string[]): Promise<number> {
    if (!tokens?.length) return 0;

    const result = await this.prisma.device_tokens.updateMany({
      where: {
        token: { in: tokens },
      },
      data: {
        last_used_at: new Date(),
      },
    });

    return result.count;
  }

  async findTokensByDevice(userId: string, deviceId: string): Promise<string[]> {
    const results = await this.prisma.device_tokens.findMany({
      where: {
        user_id: userId,
        device_id: deviceId,
        is_active: true,
      },
      select: {
        token: true,
      },
    });

    return results.map((result) => result.token);
  }

  async findTokensExcludingDevice(userId: string, excludeDeviceId: string): Promise<string[]> {
    const results = await this.prisma.device_tokens.findMany({
      where: {
        user_id: userId,
        device_id: {
          not: excludeDeviceId,
        },
        is_active: true,
      },
      select: {
        token: true,
      },
    });

    return results.map((result) => result.token);
  }
}
