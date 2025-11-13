import { Injectable, Logger } from '@nestjs/common';
import { ActivitySeverity } from '../../../core/entities/activity_logs.entity';
import { FcmToken } from '../../../core/entities/fcm-token.entity';
import { AdminOperationError, FcmAuditLog, FcmConstants } from '../../../core/types/fcm.types';
import { FcmTokenRepository } from '../../../infrastructure/repositories/notifications/fcm-token.repository';
import { isValidUuid } from '../../../shared/utils/uuid.util';
import { ActivityLogsService } from '../activity-logs.service';

@Injectable()
export class FcmAdminService {
  private readonly _logger = new Logger(FcmAdminService.name);
  constructor(
    private readonly fcmTokenRepo: FcmTokenRepository,
    private readonly activityLogsService: ActivityLogsService,
  ) {}

  // Input validation methods
  private validatePagination(
    page: number = FcmConstants.PAGINATION_DEFAULT_PAGE,
    limit: number = FcmConstants.PAGINATION_DEFAULT_LIMIT,
  ) {
    const validPage = Math.max(FcmConstants.PAGINATION_DEFAULT_PAGE, Math.floor(page));
    const validLimit = Math.min(
      FcmConstants.PAGINATION_MAX_LIMIT,
      Math.max(FcmConstants.PAGINATION_MIN_LIMIT, Math.floor(limit)),
    );
    return { page: validPage, limit: validLimit };
  }

  private validateDateRange(from?: string, to?: string) {
    if (from && isNaN(Date.parse(from))) {
      throw new AdminOperationError(
        'Invalid from date format',
        'exportTokens',
        'INVALID_DATE_FORMAT',
      );
    }
    if (to && isNaN(Date.parse(to))) {
      throw new AdminOperationError(
        'Invalid to date format',
        'exportTokens',
        'INVALID_DATE_FORMAT',
      );
    }
    if (from && to && new Date(from) > new Date(to)) {
      throw new AdminOperationError(
        'From date cannot be after to date',
        'exportTokens',
        'INVALID_DATE_RANGE',
      );
    }
    return { from, to };
  }

  private validateTokenId(id: string) {
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      throw new AdminOperationError('Invalid token ID', 'tokenOperation', 'INVALID_TOKEN_ID');
    }
    const trimmedId = id.trim();
    if (!isValidUuid(trimmedId)) {
      throw new AdminOperationError(
        'Token ID must be a valid UUID',
        'tokenOperation',
        'INVALID_TOKEN_ID',
      );
    }
    return trimmedId;
  }

  private validateUserIds(userIds: string[]) {
    if (!Array.isArray(userIds) || userIds.length === 0) {
      throw new AdminOperationError(
        'User IDs array is required and cannot be empty',
        'bulkOperation',
        'INVALID_USER_IDS',
      );
    }
    if (userIds.length > 1000) {
      throw new AdminOperationError(
        'Cannot process more than 1000 user IDs at once',
        'bulkOperation',
        'TOO_MANY_USER_IDS',
      );
    }
    return userIds.filter((id) => id && typeof id === 'string' && id.trim().length > 0);
  }

  // Audit logging methods
  private async logAdminOperation(
    operation: string,
    adminUserId?: string,
    details: any = {},
    userId?: string,
  ) {
    const auditLog: FcmAuditLog = {
      operation,
      userId,
      adminUserId,
      details,
      timestamp: new Date(),
    };

    // Log to debug logger for debugging
    this._logger.debug('[FCM_ADMIN_AUDIT] ' + JSON.stringify(auditLog, null, 2));

    // Log to database for audit trail
    try {
      await this.activityLogsService.create({
        actor_id: adminUserId,
        actor_name: adminUserId ? `Admin User ${adminUserId}` : 'System',
        action: operation,
        resource_type: 'fcm_admin_operation',
        resource_id: userId || 'system',
        message: `FCM Admin Operation: ${operation}`,
        severity: ActivitySeverity.INFO,
        meta: {
          operation,
          userId,
          adminUserId,
          details,
          timestamp: auditLog.timestamp,
        },
      });
    } catch (error) {
      this._logger.error('[FCM_ADMIN_AUDIT_ERROR] Failed to log to database:', error as any);
      // Don't throw error to avoid breaking the main operation
    }
  }

  async getAllTokens({
    userId,
    page = FcmConstants.PAGINATION_DEFAULT_PAGE,
    limit = FcmConstants.PAGINATION_DEFAULT_LIMIT,
    platform,
    active,
  }: {
    userId?: string;
    page?: number;
    limit?: number;
    platform?: string;
    active?: boolean;
  }) {
    // Validate pagination parameters
    const { page: validPage, limit: validLimit } = this.validatePagination(page, limit);

    const where: any = {};
    if (userId) where.user_id = userId;
    if (typeof active === 'boolean') where.is_active = active;
    if (platform) where.platform = this.normalizePlatform(platform);

    const tokens = await this.fcmTokenRepo.findFcmTokens(where);

    // Simple pagination
    const startIndex = (validPage - 1) * validLimit;
    const endIndex = startIndex + validLimit;
    const paginatedTokens = tokens.slice(startIndex, endIndex);

    return {
      data: paginatedTokens,
      total: tokens.length,
      page: validPage,
      limit: validLimit,
    };
  }

  async bulkDeleteTokens(userIds: string[], adminUserId?: string) {
    // Validate input parameters
    const validUserIds = this.validateUserIds(userIds);

    if (validUserIds.length === 0) {
      throw new AdminOperationError(
        'Refuse to delete without filters (userIds required)',
        'bulkDeleteTokens',
        'MISSING_FILTERS',
      );
    }

    let deletedCount = 0;
    for (const userId of validUserIds) {
      const tokens = await this.fcmTokenRepo.findFcmTokensByUserId(userId);
      for (const token of tokens) {
        const deleted = await this.fcmTokenRepo.deleteFcmToken({ id: token.id });
        if (deleted) deletedCount++;
      }
    }

    // Log admin operation
    await this.logAdminOperation('bulkDeleteTokens', adminUserId, {
      userIds: validUserIds,
      deletedCount,
    });

    return { deleted: deletedCount };
  }

  async tokenStats() {
    const platformStats = await this.fcmTokenRepo.getPlatformStats();

    return {
      byPlatform: platformStats.map((stat) => ({
        platform: stat.platform,
        count: stat.count,
      })),
      byUser: [], // This would require additional method in repository
    };
  }

  async getTokenDetail(id: string) {
    const validId = this.validateTokenId(id);
    return this.fcmTokenRepo.findOneFcmToken({ id: validId });
  }

  async updateTokenAdmin(id: string, userId?: string, platform?: string, adminUserId?: string) {
    const validId = this.validateTokenId(id);
    const token = await this.fcmTokenRepo.findOneFcmToken({ id: validId });
    if (!token) return { updated: false };

    const oldValues = {
      userId: token.user_id,
      platform: token.platform,
    };

    const updateData: Partial<FcmToken> = {};
    if (userId) updateData.user_id = userId;
    if (platform) updateData.platform = this.normalizePlatform(platform);

    const updatedToken = await this.fcmTokenRepo.updateFcmToken({ id: validId }, updateData);

    // Log admin operation
    await this.logAdminOperation(
      'updateTokenAdmin',
      adminUserId,
      {
        tokenId: validId,
        oldValues,
        newValues: { userId, platform },
      },
      userId,
    );

    return { updated: !!updatedToken };
  }

  async exportTokens({ from, to }: { from?: string; to?: string }) {
    // Validate date range
    this.validateDateRange(from, to);

    const where: any = {};
    if (from && to) {
      where.created_at = {
        gte: new Date(from),
        lte: new Date(to),
      };
    } else if (from) {
      where.created_at = { gte: new Date(from) };
    } else if (to) {
      where.created_at = { lte: new Date(to) };
    }

    return this.fcmTokenRepo.findFcmTokens(where);
  }

  async setTokenStatus(id: string, active: boolean, adminUserId?: string) {
    const validId = this.validateTokenId(id);
    const token = await this.getTokenDetail(validId);
    if (!token) return { updated: false };

    const oldStatus = token.is_active;

    const updatedToken = await this.fcmTokenRepo.updateFcmToken(
      { id: validId },
      { is_active: !!active },
    );

    // Log admin operation
    await this.logAdminOperation(
      'setTokenStatus',
      adminUserId,
      {
        tokenId: validId,
        oldStatus,
        newStatus: !!active,
      },
      token.user_id,
    );

    return { updated: !!updatedToken };
  }

  // Additional admin methods
  async getTokenHealthReport() {
    const activeTokens = await this.fcmTokenRepo.countActiveTokens();
    const inactiveTokens = await this.fcmTokenRepo.countInactiveTokens();
    const totalTokens = activeTokens + inactiveTokens;

    // Get tokens by platform
    const platformStats = await this.fcmTokenRepo.getPlatformStats();

    return {
      summary: {
        total: totalTokens,
        active: activeTokens,
        inactive: inactiveTokens,
        activeRate: totalTokens > 0 ? (activeTokens / totalTokens) * 100 : 0,
      },
      byPlatform: platformStats,
      health: {
        recentInvalidTokens: inactiveTokens,
        invalidRate: totalTokens > 0 ? (inactiveTokens / totalTokens) * 100 : 0,
        needsCleanup:
          inactiveTokens > totalTokens * (FcmConstants.INVALID_TOKEN_RATE_THRESHOLD || 0.1),
      },
    };
  }

  async cleanupInvalidTokens(olderThanDays: number = 30, adminUserId?: string) {
    const deletedCount = await this.fcmTokenRepo.deleteOldInactiveTokens(olderThanDays);

    // Log admin operation
    await this.logAdminOperation('cleanupInvalidTokens', adminUserId, {
      olderThanDays,
      deletedCount,
    });

    return { deleted: deletedCount };
  }

  // Helper methods
  private normalizePlatform(p?: string) {
    const v = String(p || '').toLowerCase();
    if (v === 'android') return 'android' as any;
    if (v === 'ios') return 'ios' as any;
    return 'web' as any;
  }
}
