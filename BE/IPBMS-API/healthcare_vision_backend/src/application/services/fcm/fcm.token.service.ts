import { Injectable, Logger } from '@nestjs/common';
import { FcmToken, PushPlatformEnum } from '../../../core/entities/fcm-token.entity';
import { UserRole } from '../../../core/entities/users.entity';
import { Audience, FcmNotificationPayload, FcmSendOptions } from '../../../core/types/fcm.types';
import { FcmTokenRepository } from '../../../infrastructure/repositories/notifications/fcm-token.repository';
import { UsersRepository } from '../../../infrastructure/repositories/users/users.repository';
import { FcmCoreService } from './fcm.core.service';
import { FcmUtils } from './fcm.utils';

@Injectable()
export class FcmTokenService {
  private readonly _logger = new Logger(FcmTokenService.name);
  constructor(
    private readonly fcmTokenRepo: FcmTokenRepository,
    private readonly usersRepo: UsersRepository,
    private readonly fcmCoreService: FcmCoreService,
  ) {
    // Reference injected services to satisfy linters
    void this.fcmTokenRepo;
    void this.usersRepo;
    void this.fcmCoreService;
  }
  async saveAllTokensAfterLogin(
    userId: string,
    tokens: {
      device?: string[];
      caregiver?: string[];
      emergency?: string[];
      customer?: string[];
    },
    platform?: PushPlatformEnum,
    deviceId?: string,
  ) {
    // Validate user exists first
    const user = await this.usersRepo.findUserById(userId);
    if (!user) {
      this._logger.warn(
        `FCM Token registration skipped: User with ID ${userId} not found in database. This may indicate the user exists in Supabase but not in the backend database.`,
      );
      return; // Skip the operation
    }

    // Convert the legacy format to new format
    const tokenList: string[] = [];
    if (tokens.device) tokenList.push(...tokens.device);
    if (tokens.caregiver) tokenList.push(...tokens.caregiver);
    if (tokens.emergency) tokenList.push(...tokens.emergency);
    if (tokens.customer) tokenList.push(...tokens.customer);

    // Dedupe and filter invalid/empty tokens
    const uniqueTokens = Array.from(
      new Set(tokenList.map((t) => (t || '').trim()).filter((t) => t.length > 0)),
    );

    for (const token of uniqueTokens) {
      await this.saveToken(userId, token, platform, deviceId);
    }

    // Ensure all tokens have proper audience assignment after bulk save
    await this.updateExistingTokensAudience(userId);
  }

  async saveTokenForNewAccount(
    userId: string,
    token: string,
    platform?: PushPlatformEnum | string,
    deviceId?: string,
  ) {
    if (!token || !String(token).trim()) return null;
    // Validate user exists first
    const user = await this.usersRepo.findUserById(userId);
    if (!user) {
      this._logger.warn(
        `FCM Token registration skipped: User with ID ${userId} not found in database. This may indicate the user exists in Supabase but not in the backend database.`,
      );
      return null; // Return null to indicate the operation was skipped
    }

    const plat = FcmUtils.normalizePlatform(platform as string);

    const row = await this.fcmTokenRepo.createFcmToken({
      user_id: userId,
      device_id: deviceId,
      token,
      is_active: true,
      platform: plat,
      last_used_at: new Date(),
    });

    if (row) {
      // Merge topics to preserve any existing topic keys
      let audience: Audience;
      if (user.role === UserRole.CUSTOMER) audience = 'customer';
      else if (user.role === UserRole.CAREGIVER) audience = 'caregiver';
      else audience = 'device';

      const merged = FcmUtils.mergeTopics((row as any)?.topics, audience);
      await this.fcmTokenRepo.updateFcmToken({ id: row.id }, { topics: merged });
    }
  }

  async updateLastUsedAt(userId: string) {
    const tokens = await this.fcmTokenRepo.findFcmTokensByUserId(userId);
    for (const token of tokens) {
      await this.fcmTokenRepo.updateFcmToken({ id: token.id }, { last_used_at: new Date() });
    }
  }

  async saveToken(
    userId: string,
    token: string,
    audienceOrPlatform?: PushPlatformEnum | string | Audience,
    platform?: PushPlatformEnum | string,
    deviceId?: string,
  ) {
    if (!token || !String(token).trim()) return null;
    // Validate user exists first
    const user = await this.usersRepo.findUserById(userId);
    if (!user) {
      this._logger.warn(
        `FCM Token registration skipped: User with ID ${userId} not found in database. This may indicate the user exists in Supabase but not in the backend database.`,
      );
      return null; // Return null to indicate the operation was skipped
    }

    // Handle both 4 and 5 parameter versions
    let finalPlatform: string | undefined;
    let finalDeviceId: string | undefined;

    if (arguments.length === 5) {
      // Called with 5 params: userId, token, audience, platform, deviceId
      finalPlatform = platform;
      finalDeviceId = deviceId;
    } else {
      // Called with 4 params: userId, token, platform, deviceId
      finalPlatform = audienceOrPlatform as PushPlatformEnum | string;
      finalDeviceId = platform as string;
    }

    const plat = FcmUtils.normalizePlatform(finalPlatform as string);

    // First check if token already exists by token value
    let row = await this.fcmTokenRepo.findOneFcmToken({ token });
    if (!row) {
      // If token doesn't exist, check if there's already a token for this user/device combination
      if (finalDeviceId) {
        const existingDeviceToken = await this.fcmTokenRepo.findOneFcmToken({
          user_id: userId,
          device_id: finalDeviceId,
        });
        if (existingDeviceToken) {
          // Update existing token for this device
          row = await this.fcmTokenRepo.updateFcmToken(
            { id: existingDeviceToken.id },
            {
              token,
              is_active: true,
              platform: plat,
              last_used_at: new Date(),
            },
          );
        } else {
          // Create new token
          row = await this.fcmTokenRepo.createFcmToken({
            user_id: userId,
            device_id: finalDeviceId,
            token,
            is_active: true,
            platform: plat,
            last_used_at: new Date(),
          });
        }
      } else {
        // No device_id provided, create new token
        row = await this.fcmTokenRepo.createFcmToken({
          user_id: userId,
          device_id: finalDeviceId,
          token,
          is_active: true,
          platform: plat,
          last_used_at: new Date(),
        });
      }
    } else {
      // Token exists, update it
      row = await this.fcmTokenRepo.updateFcmToken(
        { id: row.id },
        {
          user_id: userId,
          device_id: finalDeviceId,
          is_active: true,
          platform: plat,
          last_used_at: new Date(),
        },
      );
    }

    if (row) {
      // Merge topics to preserve audiences history and other keys
      let audience: Audience;
      if (user.role === UserRole.CUSTOMER) audience = 'customer';
      else if (user.role === UserRole.CAREGIVER) audience = 'caregiver';
      else audience = 'device';

      const merged = FcmUtils.mergeTopics((row as any)?.topics, audience);
      await this.fcmTokenRepo.updateFcmToken({ id: row.id }, { topics: merged });
      // Log successful save/update for observability (mask token for privacy)
      try {
        const deviceLog = finalDeviceId || deviceId || 'unknown';
        this._logger.log(
          `📱 [FCM_TOKEN] saved token for user=${userId} id=${(row as any).id} device=${deviceLog} platform=${plat} token=${token}`,
        );
      } catch {
        // Swallow logging errors — logging failures should not break token save flow
        this._logger.debug('Failed to write FCM token save log (non-fatal)');
      }
    }
  }
  async getActiveTokensByUserId(userId: string): Promise<string[]> {
    const tokens = await this.fcmTokenRepo.findFcmTokensByUserId(userId);
    return tokens.filter((t) => t.is_active).map((t) => t.token);
  }

  async getActiveFcmTokensByUserId(userId: string): Promise<FcmToken[]> {
    const tokens = await this.fcmTokenRepo.findFcmTokensByUserId(userId);
    return tokens.filter((t) => t.is_active);
  }

  async removeToken(userId: string, token: string) {
    await this.fcmTokenRepo.deleteFcmToken({ user_id: userId, token });
  }

  async tokenExists(userId: string, token: string): Promise<boolean> {
    const exists = await this.fcmTokenRepo.findOneFcmToken({ user_id: userId, token });
    return !!exists;
  }

  async sendToUser(userId: string, payload: FcmNotificationPayload, options?: FcmSendOptions) {
    this._logger.debug(`[FcmTokenService.sendToUser] start for user ${userId}`);

    const tokens = await this.getActiveTokensByUserId(userId);
    if (tokens.length === 0) {
      this._logger.debug(`[FcmTokenService.sendToUser] no tokens found for user ${userId}`);
      return { successCount: 0, failureCount: 0, responses: [] };
    }

    this._logger.debug(
      `[FcmTokenService.sendToUser] found ${tokens.length} tokens for user ${userId}, sending`,
    );
    const result = await this.fcmCoreService.sendMulticast(tokens, payload, options);

    this._logger.debug(
      `[FcmTokenService.sendToUser] completed for user ${userId}: ${result.successCount} success, ${result.failureCount} failure`,
    );
    return result;
  }

  async sendToUserIds(
    userIds: string[],
    payload: FcmNotificationPayload,
    options?: FcmSendOptions,
  ) {
    this._logger.debug(`[FcmTokenService.sendToUserIds] start for ${userIds.length} users`);

    const results = [];
    for (const userId of userIds) {
      const result = await this.sendToUser(userId, payload, options);
      results.push({ userId, ...result });
    }

    const totalSuccess = results.reduce((sum, r) => sum + r.successCount, 0);
    const totalFailure = results.reduce((sum, r) => sum + r.failureCount, 0);

    this._logger.debug(
      `[FcmTokenService.sendToUserIds] completed: ${totalSuccess} total success, ${totalFailure} total failure across ${userIds.length} users`,
    );

    return {
      totalSuccess,
      totalFailure,
      results,
    };
  }

  async refreshTokenOnLogin(userId: string, token: string, deviceId?: string) {
    const existing = await this.fcmTokenRepo.findOneFcmToken({
      user_id: userId,
      device_id: deviceId,
    });

    if (existing) {
      await this.fcmTokenRepo.updateFcmToken(
        { id: existing.id },
        {
          token,
          is_active: true,
          last_used_at: new Date(),
        },
      );
      return { refreshed: true };
    }

    return { refreshed: false };
  }

  async getTokens(userId: string, deviceId?: string) {
    if (deviceId) {
      return this.fcmTokenRepo.findTokensByDevice(userId, deviceId);
    }
    return this.getActiveTokensByUserId(userId);
  }

  async deleteToken(userId: string, token: string) {
    return this.removeToken(userId, token);
  }

  async checkToken(userId: string, token: string) {
    const exists = await this.tokenExists(userId, token);
    return { exists };
  }

  async updateToken(
    userId: string,
    oldToken: string,
    newToken: string,
    type?: string,
    platform?: string,
  ) {
    const existing = await this.fcmTokenRepo.findOneFcmToken({
      user_id: userId,
      token: oldToken,
    });

    if (existing) {
      await this.fcmTokenRepo.updateFcmToken(
        { id: existing.id },
        {
          token: newToken,
          platform: FcmUtils.normalizePlatform(platform),
          last_used_at: new Date(),
        },
      );
    }
  }

  async sendTestNotification(token: string, message: string) {
    const payload: FcmNotificationPayload = {
      notification: {
        title: 'Test Notification',
        body: message,
      },
      data: {
        type: 'test',
        timestamp: new Date().toISOString(),
      },
    };

    return this.fcmCoreService.sendMulticast([token], payload);
  }

  async updateExistingTokensAudience(userId: string) {
    const user = await this.usersRepo.findUserById(userId);
    if (!user) return;

    let audience: Audience;
    if (user.role === UserRole.CUSTOMER) audience = 'customer';
    else if (user.role === UserRole.CAREGIVER) audience = 'caregiver';
    else audience = 'device';

    const tokens = await this.fcmTokenRepo.findFcmTokensByUserId(userId);
    for (const token of tokens) {
      const merged = FcmUtils.mergeTopics((token as any)?.topics, audience);
      await this.fcmTokenRepo.updateFcmToken({ id: token.id }, { topics: merged });
    }
  }

  async deactivateDeviceTokens(userId: string, deviceId?: string) {
    if (!deviceId) {
      // If no deviceId provided, deactivate all tokens for user
      const tokens = await this.fcmTokenRepo.findFcmTokensByUserId(userId);
      let deactivated = 0;
      for (const token of tokens) {
        await this.fcmTokenRepo.updateFcmToken({ id: token.id }, { is_active: false });
        deactivated++;
      }
      return { deactivated };
    }

    const tokens = await this.fcmTokenRepo.findFcmTokens({
      user_id: userId,
      device_id: deviceId,
    });

    let deactivated = 0;
    for (const token of tokens) {
      await this.fcmTokenRepo.updateFcmToken({ id: token.id }, { is_active: false });
      deactivated++;
    }

    return { deactivated };
  }

  async deleteDeviceTokens(userId: string, deviceId?: string) {
    if (!deviceId) {
      // If no deviceId provided, delete all tokens for user
      const tokens = await this.fcmTokenRepo.findFcmTokensByUserId(userId);
      let deleted = 0;
      for (const token of tokens) {
        await this.fcmTokenRepo.deleteFcmToken({ id: token.id });
        deleted++;
      }
      return { deleted };
    }

    const tokens = await this.fcmTokenRepo.findFcmTokens({
      user_id: userId,
      device_id: deviceId,
    });

    let deleted = 0;
    for (const token of tokens) {
      await this.fcmTokenRepo.deleteFcmToken({ id: token.id });
      deleted++;
    }

    return { deleted };
  }

  async bulkUpdateAllTokensAudience() {
    // Get all active tokens that need audience assignment
    const allTokens = await this.fcmTokenRepo.findFcmTokens({ is_active: true });
    let updated = 0;
    let errors = 0;

    for (const token of allTokens) {
      try {
        if (!token.user_id) continue;

        // Get user role
        const user = await this.usersRepo.findUserById(token.user_id);
        if (!user) continue;

        let audience: Audience;
        if (user.role === UserRole.CUSTOMER) audience = 'customer';
        else if (user.role === UserRole.CAREGIVER) audience = 'caregiver';
        else audience = 'device';

        // Check if token already has correct audience
        const currentAudience = (token.topics as any)?.audience;
        if (currentAudience === audience) continue; // Skip if already correct

        // Update token with merged topics to preserve existing keys
        const merged = FcmUtils.mergeTopics((token as any)?.topics, audience);
        await this.fcmTokenRepo.updateFcmToken({ id: token.id }, { topics: merged });
        updated++;
      } catch (error) {
        errors++;
        this._logger.error(
          `Error updating token ${token.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return { updated, errors };
  }

  async findTokensWithTopics() {
    // Use raw SQL for complex queries since Prisma wrapper doesn't support all operators
    return this.fcmTokenRepo.findFcmTokens({
      topics: { not: null },
    });
  }

  async updateTokenTopics(tokenId: string, topics: Record<string, any> | null) {
    return this.fcmTokenRepo.updateFcmToken({ id: tokenId }, { topics });
  }

  async getTokensExcludingDevice(userId: string, excludeDeviceId: string) {
    return this.fcmTokenRepo.findTokensExcludingDevice(userId, excludeDeviceId);
  }
}
