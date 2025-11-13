import { Inject, Injectable } from '@nestjs/common';
import type { Audience } from '../../../core/types/fcm.types';
import { FcmTokenRepository } from '../../../infrastructure/repositories/notifications/fcm-token.repository';
import { FIREBASE_MESSAGING } from '../../../modules/firebase/firebase.module';
import { MonitoringService } from '../../../shared/services/monitoring.service';
import { CaregiverInvitationsService } from '../users/caregiver-invitations.service';
import { FcmAdminService, FcmCoreService, FcmNotificationService, FcmTokenService } from '../fcm';

type AudienceLegacy = 'device' | 'caregiver' | 'emergency' | 'customer';
type TokenTypeLegacy = 'device' | 'caregiver' | 'emergency' | 'customer';

/**
 * Main FCM Service - Composition of specialized services
 * This service maintains backward compatibility while using the new modular architecture
 */
@Injectable()
export class FcmService {
  constructor(
    private readonly _fcmTokenRepo: FcmTokenRepository,
    private readonly _assignmentsService: CaregiverInvitationsService,
    @Inject(FIREBASE_MESSAGING) private readonly _messaging: any,

    // Injected specialized services
    private readonly _fcmCoreService: FcmCoreService,
    private readonly _fcmTokenService: FcmTokenService,
    private readonly _fcmNotificationService: FcmNotificationService,
    private readonly _fcmAdminService: FcmAdminService,
    private readonly _monitoringService?: MonitoringService,
  ) {
    // reference to avoid unused variable lint in this compatibility wrapper
    void this._fcmTokenRepo;
    void this._assignmentsService;
    void this._messaging;
    void this._fcmCoreService;
    void this._fcmTokenService;
    void this._fcmNotificationService;
    void this._fcmAdminService;
    void this._monitoringService;
  }

  // ---------------- Legacy methods (backward compatibility) ----------------

  // Token CRUD operations - delegate to FcmTokenService
  async saveAllTokensAfterLogin(
    userId: string,
    tokens: {
      device?: string[];
      caregiver?: string[];
      emergency?: string[];
      customer?: string[];
    },
    platform?: any,
    deviceId?: string,
  ) {
    return this._fcmTokenService.saveAllTokensAfterLogin(userId, tokens, platform, deviceId);
  }

  async saveToken(
    userId: string,
    token: string,
    type: AudienceLegacy,
    platform?: any,
    deviceId?: string,
  ) {
    return this._fcmTokenService.saveToken(userId, token, type as Audience, platform, deviceId);
  }

  async refreshTokenOnLogin(userId: string, token: string, deviceId?: string) {
    return this._fcmTokenService.refreshTokenOnLogin(userId, token, deviceId);
  }

  async getTokens(userId: string, deviceId?: string) {
    return this._fcmTokenService.getTokens(userId, deviceId);
  }

  async deleteToken(userId: string, token: string) {
    return this._fcmTokenService.deleteToken(userId, token);
  }

  async checkToken(userId: string, token: string) {
    return this._fcmTokenService.checkToken(userId, token);
  }

  async updateToken(
    userId: string,
    oldToken: string,
    newToken: string,
    type?: string,
    platform?: string,
  ) {
    return this._fcmTokenService.updateToken(userId, oldToken, newToken, type, platform);
  }

  async sendTestNotification(token: string, message: string) {
    return this._fcmTokenService.sendTestNotification(token, message);
  }

  /** Return firebase/messaging status and last multicast result for debugging */
  getStatus() {
    try {
      return this._fcmCoreService.getStatus();
    } catch (e) {
      return { initialized: false, error: String(e) };
    }
  }

  async updateExistingTokensAudience(userId: string) {
    return this._fcmTokenService.updateExistingTokensAudience(userId);
  }

  // Notification operations - delegate to FcmNotificationService
  async pushSystemEvent(
    customerId: string,
    input: {
      eventId: string;
      eventType: string;
      title?: string;
      body?: string;
      deeplink?: string;
      extra?: Record<string, string>;
    },
  ) {
    return this._fcmNotificationService.pushSystemEvent(customerId, input);
  }

  async pushActorMessage(params: {
    fromUserId: string;
    toUserIds: string[];
    direction: 'customer_to_caregiver' | 'caregiver_to_customer';
    category: 'help' | 'reminder' | 'report' | 'confirm';
    message: string;
    deeplink?: string;
    extra?: Record<string, string>;
    fromToken?: string;
  }) {
    return this._fcmNotificationService.pushActorMessage(params);
  }

  async sendNotificationToUser(
    userId: string,
    title: string,
    body?: string,
    data?: Record<string, string>,
  ) {
    return this._fcmNotificationService.sendNotificationToUser(userId, title, body, data);
  }

  // Business helpers - delegate to FcmCoreService
  async filterDeliverableTargets(
    fromUserId: string,
    toUserIds: string[],
    direction: 'customer_to_caregiver' | 'caregiver_to_customer',
  ) {
    return this._fcmCoreService.filterDeliverableTargets(fromUserId, toUserIds, direction);
  }

  // ---------------- Admin operations - delegate to FcmAdminService ----------------

  async getAllTokens({
    type: _type,
    userId,
    page = 1,
    limit = 20,
    platform,
    active,
  }: {
    type?: TokenTypeLegacy;
    userId?: string;
    page?: number;
    limit?: number;
    platform?: string;
    active?: boolean;
  }) {
    return this._fcmAdminService.getAllTokens({
      userId,
      page,
      limit,
      platform,
      active,
    });
  }

  async bulkDeleteTokens(userIds: string[], type?: string, adminUserId?: string) {
    return this._fcmAdminService.bulkDeleteTokens(userIds, adminUserId);
  }

  async tokenStats() {
    return this._fcmAdminService.tokenStats();
  }

  async getTokenDetail(id: string) {
    return this._fcmAdminService.getTokenDetail(id);
  }

  async updateTokenAdmin(
    id: string,
    type?: string,
    userId?: string,
    platform?: string,
    adminUserId?: string,
  ) {
    return this._fcmAdminService.updateTokenAdmin(id, userId, platform, adminUserId);
  }

  async exportTokens({ from, to }: { from?: string; to?: string }) {
    return this._fcmAdminService.exportTokens({ from, to });
  }

  async setTokenStatus(id: string, active: boolean, adminUserId?: string) {
    return this._fcmAdminService.setTokenStatus(id, active, adminUserId);
  }

  async getTokenHealthReport() {
    return this._fcmAdminService.getTokenHealthReport();
  }

  async cleanupInvalidTokens(olderThanDays: number = 30, adminUserId?: string) {
    return this._fcmAdminService.cleanupInvalidTokens(olderThanDays, adminUserId);
  }

  // ---------------- Device Management Methods ----------------

  /**
   * Deactivate FCM tokens for a specific device when user logs out
   */
  async deactivateDeviceTokens(userId: string, deviceId?: string) {
    return this._fcmTokenService.deactivateDeviceTokens(userId, deviceId);
  }

  /**
   * Delete FCM tokens for a specific device (used during logout)
   */
  async deleteDeviceTokens(userId: string, deviceId?: string) {
    return this._fcmTokenService.deleteDeviceTokens(userId, deviceId);
  }

  /**
   * Get tokens excluding a specific device (for broadcasting to other devices)
   */
  async getTokensExcludingDevice(userId: string, excludeDeviceId: string) {
    return this._fcmTokenService.getTokensExcludingDevice(userId, excludeDeviceId);
  }

  /**
   * Send notification to a specific device only
   */
  async sendNotificationToDevice(
    userId: string,
    deviceId: string,
    title: string,
    body?: string,
    data?: Record<string, string>,
  ) {
    return this._fcmNotificationService.sendNotificationToDevice(
      userId,
      deviceId,
      title,
      body,
      data,
    );
  }

  /**
   * Broadcast notification to all devices except the sender device
   */
  async broadcastToOtherDevices(
    userId: string,
    excludeDeviceId: string,
    title: string,
    body?: string,
    data?: Record<string, string>,
  ) {
    return this._fcmNotificationService.broadcastToOtherDevices(
      userId,
      excludeDeviceId,
      title,
      body,
      data,
    );
  }
}
