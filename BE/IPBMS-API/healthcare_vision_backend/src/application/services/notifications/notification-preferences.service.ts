import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { NotificationPreferencesRepository } from '../../../infrastructure/repositories/notifications/notification-preferences.repository';
import { SystemConfigService } from '../system/system-config.service';
import { UpdateSystemNotificationDefaultsDto } from '../../../application/dto/notifications/notification-preferences.dto';

type SystemDefaultsCache = {
  prefs: UpdateSystemNotificationDefaultsDto;
  expiresAt: number;
} | null;

type NotificationPreferences = {
  system_events_enabled: boolean;
  actor_messages_enabled: boolean;
  push_notifications_enabled: boolean;
  email_notifications_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;

  // System event toggles
  fall_detection_enabled: boolean;
  seizure_detection_enabled: boolean;
  abnormal_behavior_enabled: boolean;
  emergency_enabled: boolean;
  device_offline_enabled: boolean;
  payment_failed_enabled: boolean;
  subscription_expiry_enabled: boolean;
  health_check_reminder_enabled: boolean;
  appointment_reminder_enabled: boolean;

  // User event toggles
  permission_request_enabled: boolean;
  event_update_enabled: boolean;
  caregiver_invitation_enabled: boolean;

  // Ticket toggles
  ticket_created_enabled: boolean;
  ticket_assigned_enabled: boolean;
  ticket_status_changed_enabled: boolean;
  ticket_message_enabled: boolean;
  ticket_rated_enabled: boolean;
  ticket_closed_enabled: boolean;
};

// Update DTO = Partial of it
type UpdateNotificationPreferencesDto = Partial<NotificationPreferences>;

@Injectable()
export class NotificationPreferencesService {
  private readonly logger = new Logger(NotificationPreferencesService.name);
  // Simple in-memory cache to reduce repeated DB hits for preferences
  // cache TTL is short because preferences can change via API
  private readonly _cache = new Map<string, { prefs: any; expiresAt: number }>();
  private readonly CACHE_TTL_MS = Number(process.env.NOTIF_PREFS_CACHE_TTL_MS ?? 60_000); // 60s default
  private readonly MAX_CACHE_SIZE = Number(process.env.NOTIF_PREFS_MAX_CACHE_SIZE ?? 1000); // Max 1000 users in cache
  // Cache for system-wide defaults to avoid many reads from cấu hình hệ thống
  private _systemDefaultsCache: SystemDefaultsCache = null;
  private readonly SYSTEM_DEFAULTS_CACHE_TTL_MS = Number(
    process.env.NOTIF_SYSTEM_DEFAULTS_CACHE_TTL_MS ?? 300_000,
  ); // 5 minutes default
  // Flag to prevent concurrent initialization of default settings
  private _isInitializingDefaults = false;
  // Circuit breaker for error handling
  private _errorCount = 0;
  private readonly MAX_CONSECUTIVE_ERRORS = 5;
  private _lastErrorTime = 0;
  private readonly ERROR_RESET_TIME_MS = 300_000; // 5 minutes

  constructor(
    private readonly _prismaService: PrismaService,
    private readonly _notificationPreferencesRepository: NotificationPreferencesRepository,
    private readonly _systemSettingsService: SystemConfigService,
  ) {
    // Schedule periodic cache cleanup every 5 minutes
    setInterval(
      () => {
        this.cleanupExpiredCache();
      },
      5 * 60 * 1000,
    );
  }

  private ensureValidUserId(userId: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      throw new BadRequestException('Invalid user_id format');
    }
  }

  private async ensureUserOwnership(requestingUserId: string, targetUserId: string) {
    // For admin users, allow updating any user's preferences
    // For regular users, only allow updating their own preferences
    if (requestingUserId !== targetUserId) {
      // Check if requesting user is admin
      try {
        const user = await this._prismaService.users.findUnique({
          where: { user_id: requestingUserId },
          select: { role: true },
        });

        if (!user || user.role !== 'admin') {
          throw new BadRequestException('Users can only modify their own notification preferences');
        }
      } catch (error) {
        if (error instanceof BadRequestException) {
          throw error;
        }
        this.logger.error(`Error checking user role for ${requestingUserId}:`, error);
        throw new BadRequestException('Unable to verify user permissions');
      }
    }
  }

  private shouldUseCircuitBreaker(): boolean {
    // Reset error count if enough time has passed
    if (Date.now() - this._lastErrorTime > this.ERROR_RESET_TIME_MS) {
      this._errorCount = 0;
    }

    return this._errorCount >= this.MAX_CONSECUTIVE_ERRORS;
  }

  private recordError(): void {
    this._errorCount++;
    this._lastErrorTime = Date.now();
  }

  private recordSuccess(): void {
    this._errorCount = Math.max(0, this._errorCount - 1); // Gradually reduce error count
  }

  private ensureCacheSize(): void {
    if (this._cache.size <= this.MAX_CACHE_SIZE) {
      return;
    }

    // Remove expired entries first
    const now = Date.now();
    for (const [userId, entry] of this._cache.entries()) {
      if (entry.expiresAt <= now) {
        this._cache.delete(userId);
      }
    }

    // If still over limit, remove oldest entries (simple LRU)
    if (this._cache.size > this.MAX_CACHE_SIZE) {
      const entriesToRemove = this._cache.size - this.MAX_CACHE_SIZE;
      const entries = Array.from(this._cache.entries());

      // Sort by expiresAt (oldest first) and remove
      entries
        .sort(([, a], [, b]) => a.expiresAt - b.expiresAt)
        .slice(0, entriesToRemove)
        .forEach(([userId]) => {
          this._cache.delete(userId);
        });

      this.logger.warn(
        `User preferences cache exceeded limit. Removed ${entriesToRemove} entries. Current size: ${this._cache.size}`,
      );
    }
  }

  private cleanupExpiredCache(): void {
    const now = Date.now();
    let removedCount = 0;

    for (const [userId, entry] of this._cache.entries()) {
      if (entry.expiresAt <= now) {
        this._cache.delete(userId);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      this.logger.debug(
        `Cleaned up ${removedCount} expired cache entries. Current cache size: ${this._cache.size}`,
      );
    }
  }

  private getCacheStats(): { size: number; maxSize: number; hitRate: string } {
    return {
      size: this._cache.size,
      maxSize: this.MAX_CACHE_SIZE,
      hitRate: 'N/A', // Would need hit/miss counters to calculate
    };
  }

  private setCacheEntry(userId: string, prefs: any): void {
    this.ensureCacheSize();
    this._cache.set(userId, { prefs, expiresAt: Date.now() + this.CACHE_TTL_MS });
  }

  private invalidateUserCache(userId: string): void {
    this._cache.delete(userId);
  }

  async getPreferences(requestingUserId: string, targetUserId: string) {
    this.ensureValidUserId(requestingUserId);
    this.ensureValidUserId(targetUserId);

    // Check ownership for non-admin users
    await this.ensureUserOwnership(requestingUserId, targetUserId);

    // Try cache first
    const cached = this._cache.get(targetUserId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.prefs;
    }

    // Avoid a separate "user exists" DB call: directly try to read preferences.
    // If none exist, create defaults. This reduces one DB query per call.
    let preference = await this._notificationPreferencesRepository.getByUserId(targetUserId);
    if (!preference) {
      this.logger.debug(
        `Preferences not found for user ${targetUserId}, creating default preferences`,
      );
      // Read system defaults (or fallback) and use them when creating user tùy chọn
      const systemDefaults = await this.getDefaultPreferences();
      preference = await this._notificationPreferencesRepository.createDefault(
        targetUserId,
        systemDefaults,
      );
    }
    // Cache the result for a short time to reduce hot loops from schedulers
    try {
      this.setCacheEntry(targetUserId, preference);
    } catch {
      // ignore cache failures
    }
    return preference;
  }

  async updatePreferences(
    requestingUserId: string,
    targetUserId: string,
    updateDto: UpdateNotificationPreferencesDto,
  ) {
    this.ensureValidUserId(requestingUserId);
    this.ensureValidUserId(targetUserId);
    await this.ensureUserOwnership(requestingUserId, targetUserId);

    const result = await this._notificationPreferencesRepository.upsert(targetUserId, updateDto);
    // Invalidate cache for the target user
    this.invalidateUserCache(targetUserId);
    return result;
  }

  async setQuietHours(requestingUserId: string, targetUserId: string, start: string, end: string) {
    this.ensureValidUserId(requestingUserId);
    this.ensureValidUserId(targetUserId);
    await this.ensureUserOwnership(requestingUserId, targetUserId);

    this.validateQuietHours(start, end);
    const result = await this._notificationPreferencesRepository.upsert(targetUserId, {
      quiet_hours_start: start,
      quiet_hours_end: end,
    });
    this.invalidateUserCache(targetUserId);
    return result;
  }

  async disableQuietHours(requestingUserId: string, targetUserId: string) {
    this.ensureValidUserId(requestingUserId);
    this.ensureValidUserId(targetUserId);
    await this.ensureUserOwnership(requestingUserId, targetUserId);

    const result = await this._notificationPreferencesRepository.upsert(targetUserId, {
      quiet_hours_start: null,
      quiet_hours_end: null,
    });
    this.invalidateUserCache(targetUserId);
    return result;
  }

  async toggleSystemEvents(requestingUserId: string, targetUserId: string, enabled: boolean) {
    this.ensureValidUserId(requestingUserId);
    this.ensureValidUserId(targetUserId);
    await this.ensureUserOwnership(requestingUserId, targetUserId);

    const result = await this._notificationPreferencesRepository.upsert(targetUserId, {
      system_events_enabled: enabled,
    });
    this.invalidateUserCache(targetUserId);
    return result;
  }

  async toggleActorMessages(requestingUserId: string, targetUserId: string, enabled: boolean) {
    this.ensureValidUserId(requestingUserId);
    this.ensureValidUserId(targetUserId);
    await this.ensureUserOwnership(requestingUserId, targetUserId);

    const result = await this._notificationPreferencesRepository.upsert(targetUserId, {
      actor_messages_enabled: enabled,
    });
    this.invalidateUserCache(targetUserId);
    return result;
  }

  async togglePush(requestingUserId: string, targetUserId: string, enabled: boolean) {
    this.ensureValidUserId(requestingUserId);
    this.ensureValidUserId(targetUserId);
    await this.ensureUserOwnership(requestingUserId, targetUserId);

    const result = await this._notificationPreferencesRepository.upsert(targetUserId, {
      push_notifications_enabled: enabled,
    });
    this.invalidateUserCache(targetUserId);
    return result;
  }

  async shouldSendNotification(userId: string, type: 'system' | 'actor' | 'push') {
    this.ensureValidUserId(userId);

    // Check circuit breaker
    if (this.shouldUseCircuitBreaker()) {
      this.logger.warn(
        `Circuit breaker active for shouldSendNotification (user: ${userId}, type: ${type}). Too many consecutive errors.`,
      );
      return false; // Fail-safe: don't send notifications when service is unstable
    }

    try {
      const result = await this._notificationPreferencesRepository.shouldSendNotification(
        userId,
        type,
      );
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordError();
      this.logger.error(
        `Error checking notification preference for user ${userId}, type ${type}:`,
        error,
      );
      // Fail-safe: don't send if we can't determine preference
      return false;
    }
  }

  async shouldSendEventType(userId: string, eventType: string) {
    this.ensureValidUserId(userId);

    // Check circuit breaker
    if (this.shouldUseCircuitBreaker()) {
      this.logger.warn(
        `Circuit breaker active for shouldSendEventType (user: ${userId}, eventType: ${eventType}). Too many consecutive errors.`,
      );
      return false; // Fail-safe: don't send notifications when service is unstable
    }

    try {
      const result = await this._notificationPreferencesRepository.shouldSendEventType(
        userId,
        eventType,
      );
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordError();
      this.logger.error(
        `Error checking event type notification preference for user ${userId}, eventType ${eventType}:`,
        error,
      );
      // Fail-safe: don't send if we can't determine preference
      return false;
    }
  }

  // Ticket notification preference methods
  async shouldSendTicketNotification(userId: string, ticketEventType: string): Promise<boolean> {
    this.ensureValidUserId(userId);

    try {
      const preferences = await this.getPreferences(userId, userId);

      switch (ticketEventType) {
        case 'ticket_created':
          return preferences.ticket_created_enabled && preferences.push_notifications_enabled;
        case 'ticket_assigned':
          return preferences.ticket_assigned_enabled && preferences.push_notifications_enabled;
        case 'ticket_status_changed':
          return (
            preferences.ticket_status_changed_enabled && preferences.push_notifications_enabled
          );
        case 'ticket_message':
          return preferences.ticket_message_enabled && preferences.push_notifications_enabled;
        case 'ticket_rated':
          return preferences.ticket_rated_enabled && preferences.push_notifications_enabled;
        case 'ticket_closed':
          return preferences.ticket_closed_enabled && preferences.push_notifications_enabled;
        default:
          this.logger.warn(`Unknown ticket event type: ${ticketEventType} for user ${userId}`);
          return false; // Don't send unknown event types
      }
    } catch (error) {
      this.logger.error(
        `Error checking ticket notification preference for user ${userId}, event: ${ticketEventType}:`,
        error,
      );
      // More conservative fallback: don't send if we can't determine preference
      // This prevents spam notifications when service is having issues
      return false;
    }
  }

  async shouldSendEventUpdate(userId: string): Promise<boolean> {
    this.ensureValidUserId(userId);
    try {
      const preferences = await this.getPreferences(userId, userId);
      return preferences.event_update_enabled && preferences.push_notifications_enabled;
    } catch (error) {
      this.logger.error(
        `Error checking event update notification preference for user ${userId}:`,
        error,
      );
      // More conservative fallback: don't send if we can't determine preference
      return false;
    }
  }

  async toggleTicketCreated(requestingUserId: string, targetUserId: string, enabled: boolean) {
    this.ensureValidUserId(requestingUserId);
    this.ensureValidUserId(targetUserId);
    await this.ensureUserOwnership(requestingUserId, targetUserId);

    const result = await this._notificationPreferencesRepository.upsert(targetUserId, {
      ticket_created_enabled: enabled,
    });
    this.invalidateUserCache(targetUserId);
    return result;
  }

  async toggleTicketAssigned(requestingUserId: string, targetUserId: string, enabled: boolean) {
    this.ensureValidUserId(requestingUserId);
    this.ensureValidUserId(targetUserId);
    await this.ensureUserOwnership(requestingUserId, targetUserId);

    const result = await this._notificationPreferencesRepository.upsert(targetUserId, {
      ticket_assigned_enabled: enabled,
    });
    this.invalidateUserCache(targetUserId);
    return result;
  }

  async toggleTicketStatusChanged(
    requestingUserId: string,
    targetUserId: string,
    enabled: boolean,
  ) {
    this.ensureValidUserId(requestingUserId);
    this.ensureValidUserId(targetUserId);
    await this.ensureUserOwnership(requestingUserId, targetUserId);

    const result = await this._notificationPreferencesRepository.upsert(targetUserId, {
      ticket_status_changed_enabled: enabled,
    });
    this.invalidateUserCache(targetUserId);
    return result;
  }

  async toggleTicketMessage(requestingUserId: string, targetUserId: string, enabled: boolean) {
    this.ensureValidUserId(requestingUserId);
    this.ensureValidUserId(targetUserId);
    await this.ensureUserOwnership(requestingUserId, targetUserId);

    const result = await this._notificationPreferencesRepository.upsert(targetUserId, {
      ticket_message_enabled: enabled,
    });
    this.invalidateUserCache(targetUserId);
    return result;
  }

  async toggleTicketRated(requestingUserId: string, targetUserId: string, enabled: boolean) {
    this.ensureValidUserId(requestingUserId);
    this.ensureValidUserId(targetUserId);
    await this.ensureUserOwnership(requestingUserId, targetUserId);

    const result = await this._notificationPreferencesRepository.upsert(targetUserId, {
      ticket_rated_enabled: enabled,
    });
    this.invalidateUserCache(targetUserId);
    return result;
  }

  async toggleTicketClosed(requestingUserId: string, targetUserId: string, enabled: boolean) {
    this.ensureValidUserId(requestingUserId);
    this.ensureValidUserId(targetUserId);
    await this.ensureUserOwnership(requestingUserId, targetUserId);

    const result = await this._notificationPreferencesRepository.upsert(targetUserId, {
      ticket_closed_enabled: enabled,
    });
    this.invalidateUserCache(targetUserId);
    return result;
  }

  async getUsersWithMedicationReminders(): Promise<string[]> {
    // TODO: Implement logic to get users who have medication reminders scheduled
    // This would typically query patient_habits or patient_medical_histories tables
    // For now, return empty array - this needs to be implemented based on business logic
    return [];
  }

  async getUsersWithHealthCheckReminders(): Promise<string[]> {
    // TODO: Implement logic to get users who have health check reminders scheduled
    // This would typically query patient_habits for health-related activities
    return [];
  }

  async getUsersWithAppointmentReminders(): Promise<string[]> {
    // TODO: Implement logic to get users who have upcoming appointments
    // This would typically query appointments table
    return [];
  }

  async getUsersWithEmergencyDrillReminders(): Promise<string[]> {
    // TODO: Implement logic to get users who have emergency drill reminders scheduled
    // This would typically query emergency drill schedules
    return [];
  }

  // System notification preference methods
  async toggleFallDetection(requestingUserId: string, targetUserId: string, enabled: boolean) {
    this.ensureValidUserId(requestingUserId);
    this.ensureValidUserId(targetUserId);
    await this.ensureUserOwnership(requestingUserId, targetUserId);

    const result = await this._notificationPreferencesRepository.upsert(targetUserId, {
      fall_detection_enabled: enabled,
    });
    this.invalidateUserCache(targetUserId);
    return result;
  }

  async toggleSeizureDetection(requestingUserId: string, targetUserId: string, enabled: boolean) {
    this.ensureValidUserId(requestingUserId);
    this.ensureValidUserId(targetUserId);
    await this.ensureUserOwnership(requestingUserId, targetUserId);

    const result = await this._notificationPreferencesRepository.upsert(targetUserId, {
      seizure_detection_enabled: enabled,
    });
    this.invalidateUserCache(targetUserId);
    return result;
  }

  async toggleAbnormalBehavior(requestingUserId: string, targetUserId: string, enabled: boolean) {
    this.ensureValidUserId(requestingUserId);
    this.ensureValidUserId(targetUserId);
    await this.ensureUserOwnership(requestingUserId, targetUserId);

    const result = await this._notificationPreferencesRepository.upsert(targetUserId, {
      abnormal_behavior_enabled: enabled,
    });
    this.invalidateUserCache(targetUserId);
    return result;
  }

  async toggleEmergency(requestingUserId: string, targetUserId: string, enabled: boolean) {
    this.ensureValidUserId(requestingUserId);
    this.ensureValidUserId(targetUserId);
    await this.ensureUserOwnership(requestingUserId, targetUserId);

    const result = await this._notificationPreferencesRepository.upsert(targetUserId, {
      emergency_enabled: enabled,
    });
    this.invalidateUserCache(targetUserId);
    return result;
  }

  async toggleDeviceOffline(requestingUserId: string, targetUserId: string, enabled: boolean) {
    this.ensureValidUserId(requestingUserId);
    this.ensureValidUserId(targetUserId);
    await this.ensureUserOwnership(requestingUserId, targetUserId);

    const result = await this._notificationPreferencesRepository.upsert(targetUserId, {
      device_offline_enabled: enabled,
    });
    this.invalidateUserCache(targetUserId);
    return result;
  }

  async togglePaymentFailed(requestingUserId: string, targetUserId: string, enabled: boolean) {
    this.ensureValidUserId(requestingUserId);
    this.ensureValidUserId(targetUserId);
    await this.ensureUserOwnership(requestingUserId, targetUserId);

    const result = await this._notificationPreferencesRepository.upsert(targetUserId, {
      payment_failed_enabled: enabled,
    });
    this.invalidateUserCache(targetUserId);
    return result;
  }

  async toggleSubscriptionExpiry(requestingUserId: string, targetUserId: string, enabled: boolean) {
    this.ensureValidUserId(requestingUserId);
    this.ensureValidUserId(targetUserId);
    await this.ensureUserOwnership(requestingUserId, targetUserId);

    const result = await this._notificationPreferencesRepository.upsert(targetUserId, {
      subscription_expiry_enabled: enabled,
    });
    this.invalidateUserCache(targetUserId);
    return result;
  }

  async toggleHealthCheckReminder(
    requestingUserId: string,
    targetUserId: string,
    enabled: boolean,
  ) {
    this.ensureValidUserId(requestingUserId);
    this.ensureValidUserId(targetUserId);
    await this.ensureUserOwnership(requestingUserId, targetUserId);

    const result = await this._notificationPreferencesRepository.upsert(targetUserId, {
      health_check_reminder_enabled: enabled,
    });
    this.invalidateUserCache(targetUserId);
    return result;
  }

  async toggleAppointmentReminder(
    requestingUserId: string,
    targetUserId: string,
    enabled: boolean,
  ) {
    this.ensureValidUserId(requestingUserId);
    this.ensureValidUserId(targetUserId);
    await this.ensureUserOwnership(requestingUserId, targetUserId);

    const result = await this._notificationPreferencesRepository.upsert(targetUserId, {
      appointment_reminder_enabled: enabled,
    });
    this.invalidateUserCache(targetUserId);
    return result;
  }

  // User notification preference methods
  async togglePermissionRequest(requestingUserId: string, targetUserId: string, enabled: boolean) {
    this.ensureValidUserId(requestingUserId);
    this.ensureValidUserId(targetUserId);
    await this.ensureUserOwnership(requestingUserId, targetUserId);

    const result = await this._notificationPreferencesRepository.upsert(targetUserId, {
      permission_request_enabled: enabled,
    });
    this.invalidateUserCache(targetUserId);
    return result;
  }

  async toggleEventUpdate(requestingUserId: string, targetUserId: string, enabled: boolean) {
    this.ensureValidUserId(requestingUserId);
    this.ensureValidUserId(targetUserId);
    await this.ensureUserOwnership(requestingUserId, targetUserId);

    const result = await this._notificationPreferencesRepository.upsert(targetUserId, {
      event_update_enabled: enabled,
    });
    this.invalidateUserCache(targetUserId);
    return result;
  }

  async toggleCaregiverInvitation(
    requestingUserId: string,
    targetUserId: string,
    enabled: boolean,
  ) {
    this.ensureValidUserId(requestingUserId);
    this.ensureValidUserId(targetUserId);
    await this.ensureUserOwnership(requestingUserId, targetUserId);

    const result = await this._notificationPreferencesRepository.upsert(targetUserId, {
      caregiver_invitation_enabled: enabled,
    });
    this.invalidateUserCache(targetUserId);
    return result;
  }

  async getSystemDefaults() {
    return this.getDefaultPreferences();
  }

  async updateSystemDefaults(updates: UpdateSystemNotificationDefaultsDto) {
    const updatedFields: string[] = [];

    // Update each setting if provided
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        const settingKey = `notification.default.${key}`;
        await this._systemSettingsService.setSettingValue(settingKey, value.toString(), 'system');
        updatedFields.push(key);
      }
    }

    // Invalidate both system defaults cache and ALL user caches to ensure consistency
    this._systemDefaultsCache = null;
    this._cache.clear(); // Clear all user preference caches

    this.logger.log(
      `System notification defaults updated. Cleared system cache and ${this._cache.size} user caches`,
    );

    return {
      message: 'System notification defaults updated successfully',
      updated_fields: updatedFields,
      caches_cleared: 'system_defaults_and_user_caches',
    };
  }

  private async checkUserExists(userId: string): Promise<boolean> {
    try {
      const user = await this._prismaService.users.findUnique({
        where: { user_id: userId },
        select: { user_id: true },
      });
      return !!user;
    } catch (error) {
      this.logger.error(`Error checking if user exists: ${userId}`, error);
      return false;
    }
  }

  private async getDefaultPreferences(attempt = 0): Promise<UpdateSystemNotificationDefaultsDto> {
    // Return cached system defaults if fresh
    if (this._systemDefaultsCache && this._systemDefaultsCache.expiresAt > Date.now()) {
      return this._systemDefaultsCache.prefs;
    }

    try {
      // Batch read all notification default settings
      const settingKeys = [
        'notification.default.system_events_enabled',
        'notification.default.actor_messages_enabled',
        'notification.default.push_notifications_enabled',
        'notification.default.email_notifications_enabled',
        'notification.default.fall_detection_enabled',
        'notification.default.seizure_detection_enabled',
        'notification.default.abnormal_behavior_enabled',
        'notification.default.emergency_enabled',
        'notification.default.device_offline_enabled',
        'notification.default.payment_failed_enabled',
        'notification.default.subscription_expiry_enabled',
        'notification.default.health_check_reminder_enabled',
        'notification.default.appointment_reminder_enabled',
        'notification.default.permission_request_enabled',
        'notification.default.event_update_enabled',
        'notification.default.caregiver_invitation_enabled',
        'notification.default.ticket_created_enabled',
        'notification.default.ticket_assigned_enabled',
        'notification.default.ticket_status_changed_enabled',
        'notification.default.ticket_message_enabled',
        'notification.default.ticket_rated_enabled',
        'notification.default.ticket_closed_enabled',
      ];

      const settings = await this._systemSettingsService.getMultipleBooleans(settingKeys);

      // Read default preferences from cấu hình hệ thống
      const defaults: UpdateSystemNotificationDefaultsDto = {
        system_events_enabled: settings['notification.default.system_events_enabled'],
        actor_messages_enabled: settings['notification.default.actor_messages_enabled'],
        push_notifications_enabled: settings['notification.default.push_notifications_enabled'],
        email_notifications_enabled: settings['notification.default.email_notifications_enabled'],
        fall_detection_enabled: settings['notification.default.fall_detection_enabled'],
        seizure_detection_enabled: settings['notification.default.seizure_detection_enabled'],
        abnormal_behavior_enabled: settings['notification.default.abnormal_behavior_enabled'],
        // System notification preferences
        emergency_enabled: settings['notification.default.emergency_enabled'],
        device_offline_enabled: settings['notification.default.device_offline_enabled'],
        payment_failed_enabled: settings['notification.default.payment_failed_enabled'],
        subscription_expiry_enabled: settings['notification.default.subscription_expiry_enabled'],
        health_check_reminder_enabled:
          settings['notification.default.health_check_reminder_enabled'],
        appointment_reminder_enabled: settings['notification.default.appointment_reminder_enabled'],
        // User notification preferences
        permission_request_enabled: settings['notification.default.permission_request_enabled'],
        event_update_enabled: settings['notification.default.event_update_enabled'],
        caregiver_invitation_enabled: settings['notification.default.caregiver_invitation_enabled'],
        // Ticket notification preferences
        ticket_created_enabled: settings['notification.default.ticket_created_enabled'],
        ticket_assigned_enabled: settings['notification.default.ticket_assigned_enabled'],
        ticket_status_changed_enabled:
          settings['notification.default.ticket_status_changed_enabled'],
        ticket_message_enabled: settings['notification.default.ticket_message_enabled'],
        ticket_rated_enabled: settings['notification.default.ticket_rated_enabled'],
        ticket_closed_enabled: settings['notification.default.ticket_closed_enabled'],
      };

      // Check if any defaults are null (meaning cấu hình hệ thống values don't exist), if so initialize them
      const nullKeys = Object.entries(defaults)
        .filter(([_, value]) => value === null)
        .map(([key, _]) => key);

      if (nullKeys.length > 0) {
        this.logger.warn(
          `Một số cấu hình hệ thống mặc định thiếu: ${nullKeys.join(', ')}, đang khởi tạo với giá trị mặc định`,
        );
        // Limit recursion to 1 retry to avoid infinite loops if initialization fails
        if (attempt >= 1) {
          this.logger.error(
            'initializeDefaultSettings previously attempted and failed, returning hard-coded defaults',
          );
          const fallback =
            this.getFallbackDefaults() as unknown as UpdateSystemNotificationDefaultsDto;
          // Cache fallback as well
          this._systemDefaultsCache = {
            prefs: fallback,
            expiresAt: Date.now() + this.SYSTEM_DEFAULTS_CACHE_TTL_MS,
          };
          return fallback;
        }

        await this.initializeDefaultSettings();
        // Retry reading after initialization (one retry)
        const reloaded = await this.getDefaultPreferences(attempt + 1);
        // Cache loaded defaults
        this._systemDefaultsCache = {
          prefs: reloaded,
          expiresAt: Date.now() + this.SYSTEM_DEFAULTS_CACHE_TTL_MS,
        };
        return reloaded;
      }

      // Cache defaults
      this._systemDefaultsCache = {
        prefs: defaults,
        expiresAt: Date.now() + this.SYSTEM_DEFAULTS_CACHE_TTL_MS,
      };
      return defaults;
    } catch (error) {
      this.logger.error('Không đọc được cấu hình hệ thống mặc định, sẽ dùng fallback', error);
      // Fallback to hard-coded defaults if system settings fail
      const fallback = this.getFallbackDefaults() as unknown as UpdateSystemNotificationDefaultsDto;
      this._systemDefaultsCache = {
        prefs: fallback,
        expiresAt: Date.now() + this.SYSTEM_DEFAULTS_CACHE_TTL_MS,
      };
      return fallback;
    }
  }

  private getFallbackDefaults() {
    return {
      system_events_enabled: true,
      actor_messages_enabled: true,
      push_notifications_enabled: true,
      email_notifications_enabled: true,
      fall_detection_enabled: true,
      seizure_detection_enabled: true,
      abnormal_behavior_enabled: true,
      // System notification preferences - all enabled by default
      emergency_enabled: true,
      device_offline_enabled: true,
      payment_failed_enabled: true,
      subscription_expiry_enabled: true,
      health_check_reminder_enabled: true,
      appointment_reminder_enabled: true,
      // User notification preferences - all enabled by default
      permission_request_enabled: true,
      event_update_enabled: true,
      caregiver_invitation_enabled: true,
      // Ticket notification preferences - all enabled by default
      ticket_created_enabled: true,
      ticket_assigned_enabled: true,
      ticket_status_changed_enabled: true,
      ticket_message_enabled: true,
      ticket_rated_enabled: true,
      ticket_closed_enabled: true,
    };
  }

  private async initializeDefaultSettings(): Promise<void> {
    // Prevent multiple concurrent initialization attempts
    if (this._isInitializingDefaults) {
      this.logger.debug('Default settings initialization already in progress, waiting...');
      // Wait for existing initialization to complete
      while (this._isInitializingDefaults) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      return;
    }

    this._isInitializingDefaults = true;

    try {
      const defaultSettings = [
        {
          setting_key: 'notification.default.system_events_enabled',
          setting_value: 'true',
          description: 'Default preference for system events notifications',
          category: 'notifications',
          updated_by: 'system',
        },
        {
          setting_key: 'notification.default.actor_messages_enabled',
          setting_value: 'true',
          description: 'Default preference for actor messages notifications',
          category: 'notifications',
          updated_by: 'system',
        },
        {
          setting_key: 'notification.default.push_notifications_enabled',
          setting_value: 'true',
          description: 'Default preference for push notifications',
          category: 'notifications',
          updated_by: 'system',
        },
        {
          setting_key: 'notification.default.email_notifications_enabled',
          setting_value: 'false',
          description: 'Default preference for email notifications',
          category: 'notifications',
          updated_by: 'system',
        },
        {
          setting_key: 'notification.default.fall_detection_enabled',
          setting_value: 'true',
          description: 'Default preference for fall detection notifications',
          category: 'notifications',
          updated_by: 'system',
        },
        {
          setting_key: 'notification.default.seizure_detection_enabled',
          setting_value: 'true',
          description: 'Default preference for seizure detection notifications',
          category: 'notifications',
          updated_by: 'system',
        },
        {
          setting_key: 'notification.default.abnormal_behavior_enabled',
          setting_value: 'true',
          description: 'Default preference for abnormal behavior notifications',
          category: 'notifications',
          updated_by: 'system',
        },
        {
          setting_key: 'notification.default.emergency_enabled',
          setting_value: 'true',
          description: 'Default preference for emergency notifications',
          category: 'notifications',
          updated_by: 'system',
        },
        {
          setting_key: 'notification.default.device_offline_enabled',
          setting_value: 'true',
          description: 'Default preference for device offline notifications',
          category: 'notifications',
          updated_by: 'system',
        },
        {
          setting_key: 'notification.default.payment_failed_enabled',
          setting_value: 'true',
          description: 'Default preference for payment failed notifications',
          category: 'notifications',
          updated_by: 'system',
        },
        {
          setting_key: 'notification.default.subscription_expiry_enabled',
          setting_value: 'true',
          description: 'Default preference for subscription expiry notifications',
          category: 'notifications',
          updated_by: 'system',
        },
        {
          setting_key: 'notification.default.health_check_reminder_enabled',
          setting_value: 'true',
          description: 'Default preference for health check reminder notifications',
          category: 'notifications',
          updated_by: 'system',
        },
        {
          setting_key: 'notification.default.appointment_reminder_enabled',
          setting_value: 'true',
          description: 'Default preference for appointment reminder notifications',
          category: 'notifications',
          updated_by: 'system',
        },
        {
          setting_key: 'notification.default.permission_request_enabled',
          setting_value: 'true',
          description: 'Default preference for permission request notifications',
          category: 'notifications',
          updated_by: 'system',
        },
        {
          setting_key: 'notification.default.event_update_enabled',
          setting_value: 'true',
          description: 'Default preference for event update notifications',
          category: 'notifications',
          updated_by: 'system',
        },
        {
          setting_key: 'notification.default.caregiver_invitation_enabled',
          setting_value: 'true',
          description: 'Default preference for caregiver invitation notifications',
          category: 'notifications',
          updated_by: 'system',
        },
        {
          setting_key: 'notification.default.ticket_created_enabled',
          setting_value: 'true',
          description: 'Default preference for ticket created notifications',
          category: 'notifications',
          updated_by: 'system',
        },
        {
          setting_key: 'notification.default.ticket_assigned_enabled',
          setting_value: 'true',
          description: 'Default preference for ticket assigned notifications',
          category: 'notifications',
          updated_by: 'system',
        },
        {
          setting_key: 'notification.default.ticket_status_changed_enabled',
          setting_value: 'true',
          description: 'Default preference for ticket status changed notifications',
          category: 'notifications',
          updated_by: 'system',
        },
        {
          setting_key: 'notification.default.ticket_message_enabled',
          setting_value: 'true',
          description: 'Default preference for ticket message notifications',
          category: 'notifications',
          updated_by: 'system',
        },
        {
          setting_key: 'notification.default.ticket_rated_enabled',
          setting_value: 'true',
          description: 'Default preference for ticket rated notifications',
          category: 'notifications',
          updated_by: 'system',
        },
        {
          setting_key: 'notification.default.ticket_closed_enabled',
          setting_value: 'true',
          description: 'Default preference for ticket closed notifications',
          category: 'notifications',
          updated_by: 'system',
        },
      ];

      // Use batch upsert with transaction for atomicity
      await this._systemSettingsService.batchUpsertSettings(defaultSettings);

      this.logger.log(
        `Successfully initialized ${defaultSettings.length} notification default settings`,
      );
    } catch (error) {
      this.logger.error('Failed to initialize default notification settings', error);
      throw error; // Re-throw to let caller handle
    } finally {
      this._isInitializingDefaults = false;
    }
  }

  private validateQuietHours(start: string, end: string): void {
    // Validate time format (HH:MM)
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(start) || !timeRegex.test(end)) {
      throw new BadRequestException('Quiet hours must be in HH:MM format');
    }

    // Convert to minutes for comparison
    const startMinutes = this.timeToMinutes(start);
    const endMinutes = this.timeToMinutes(end);

    // End time must be after start time (allowing overnight periods)
    if (startMinutes === endMinutes) {
      throw new BadRequestException('Quiet hours start and end times cannot be the same');
    }
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }
}
