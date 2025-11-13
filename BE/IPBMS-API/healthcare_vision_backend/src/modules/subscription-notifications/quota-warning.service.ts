import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { FcmService } from '../../application/services/notifications/fcm.service';
import { ActivityLogsService } from '../../application/services/shared/activity-logs.service';
import { ActivityAction, ActivitySeverity } from '../../core/entities/activity_logs.entity';

export interface QuotaWarning {
  type: 'camera' | 'storage' | 'caregiver';
  currentUsage: number;
  limit: number;
  percentage: number;
  planName: string;
}

@Injectable()
export class QuotaWarningService {
  private readonly logger = new Logger(QuotaWarningService.name);

  // Warning thresholds
  private readonly WARNING_THRESHOLDS = {
    camera: 0.8, // 80% usage
    storage: 0.9, // 90% usage
    caregiver: 0.8, // 80% usage
  };

  constructor(
    private readonly _prisma: PrismaService,
    private readonly _fcmService: FcmService,
    private readonly _activityLogsService: ActivityLogsService,
  ) {}

  /**
   * Check all active subscriptions for quota warnings
   */
  async checkQuotaWarnings(): Promise<void> {
    const startTime = Date.now();
    const executionId = `quota-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    this.logger.log(
      '[checkQuotaWarnings] Starting quota usage check for all active subscriptions...',
      {
        executionId,
        timestamp: new Date().toISOString(),
        warningThresholds: this.WARNING_THRESHOLDS,
      },
    );

    // Log activity start
    await this._activityLogsService.create({
      action: 'check_quota_warnings_start',
      action_enum: ActivityAction.NOTIFY,
      resource_type: 'subscription',
      severity: ActivitySeverity.INFO,
      message: 'Bắt đầu kiểm tra hạn mức sử dụng cho tất cả subscriptions',
    });

    try {
      // Get all active subscriptions with plan details
      const activeSubscriptions = await this._prisma.subscriptions.findMany({
        where: {
          status: { in: ['active', 'trialing'] },
        },
        include: {
          users: true,
          plans: true,
        },
      });

      this.logger.log(
        `[checkQuotaWarnings] Found ${activeSubscriptions.length} active subscriptions to check`,
        {
          executionId,
          subscriptionCount: activeSubscriptions.length,
          queryTimeMs: Date.now() - startTime,
          warningThresholds: this.WARNING_THRESHOLDS,
        },
      );

      let processedCount = 0;
      let warningSentCount = 0;
      let errorCount = 0;

      for (const subscription of activeSubscriptions) {
        try {
          const hasWarnings = await this.checkSubscriptionQuotas(subscription);
          processedCount++;

          if (hasWarnings) {
            warningSentCount++;
          }
        } catch (error) {
          this.logger.error(
            `[checkQuotaWarnings] Error checking quotas for subscription ${subscription.subscription_id}:`,
            {
              executionId,
              subscriptionId: subscription.subscription_id,
              userId: subscription.user_id,
              error: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined,
            },
          );
          errorCount++;
        }
      }

      const totalTime = Date.now() - startTime;
      this.logger.log('[checkQuotaWarnings] Quota check processing completed', {
        executionId,
        totalSubscriptions: activeSubscriptions.length,
        processedCount,
        warningSentCount,
        errorCount,
        totalTimeMs: totalTime,
        averageTimePerSubscription:
          activeSubscriptions.length > 0 ? totalTime / activeSubscriptions.length : 0,
        timestamp: new Date().toISOString(),
      });

      // Log activity completion
      await this._activityLogsService.create({
        action: 'check_quota_warnings_complete',
        action_enum: ActivityAction.NOTIFY,
        resource_type: 'subscription',
        severity: ActivitySeverity.INFO,
        message: `Hoàn thành kiểm tra hạn mức: ${warningSentCount} cảnh báo được gửi`,
        meta: {
          totalSubscriptions: activeSubscriptions.length,
          processedCount,
          warningSentCount,
          errorCount,
          totalTimeMs: totalTime,
        },
      });
    } catch (error) {
      this.logger.error('[checkQuotaWarnings] Fatal error:', {
        executionId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        processingTimeMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  /**
   * Check quotas for a specific subscription
   */
  private async checkSubscriptionQuotas(subscription: any): Promise<boolean> {
    const user = subscription.users;
    const plan = subscription.plans;

    if (!user || !plan) {
      this.logger.warn(
        `[checkSubscriptionQuotas] Missing user or plan data for subscription ${subscription.subscription_id}`,
        {
          subscriptionId: subscription.subscription_id,
          hasUser: !!user,
          hasPlan: !!plan,
        },
      );
      return false;
    }

    const warnings: QuotaWarning[] = [];

    // Check camera quota
    const cameraWarning = await this.checkCameraQuota(user.user_id, plan);
    if (cameraWarning) warnings.push(cameraWarning);

    // Check storage quota
    const storageWarning = await this.checkStorageQuota(user.user_id, plan);
    if (storageWarning) warnings.push(storageWarning);

    // Check caregiver quota
    const caregiverWarning = await this.checkCaregiverQuota(user.user_id, plan);
    if (caregiverWarning) warnings.push(caregiverWarning);

    // Send warnings if any
    if (warnings.length > 0) {
      await this.sendQuotaWarnings(user, plan, warnings);
      return true;
    }

    return false;
  }

  /**
   * Check camera quota usage
   */
  private async checkCameraQuota(userId: string, plan: any): Promise<QuotaWarning | null> {
    try {
      const cameraCount = await this._prisma.cameras.count({
        where: { user_id: userId },
      });

      const limit = plan.camera_quota || 0;
      const percentage = limit > 0 ? cameraCount / limit : 0;

      this.logger.debug(`[checkCameraQuota] Camera usage check for user ${userId}`, {
        userId,
        cameraCount,
        limit,
        percentage: Math.round(percentage * 100),
        threshold: this.WARNING_THRESHOLDS.camera * 100,
        planCode: plan.code,
      });

      if (percentage >= this.WARNING_THRESHOLDS.camera) {
        this.logger.warn(`[checkCameraQuota] Camera quota warning triggered for user ${userId}`, {
          userId,
          cameraCount,
          limit,
          percentage: Math.round(percentage * 100),
          planCode: plan.code,
        });

        return {
          type: 'camera',
          currentUsage: cameraCount,
          limit,
          percentage: Math.round(percentage * 100),
          planName: plan.name,
        };
      }

      return null;
    } catch (error) {
      this.logger.error(`[checkCameraQuota] Error checking camera quota for user ${userId}:`, {
        userId,
        planCode: plan.code,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Check storage quota usage
   */
  private async checkStorageQuota(userId: string, plan: any): Promise<QuotaWarning | null> {
    try {
      // For now, we'll use a simple estimation based on snapshots count
      // In a real implementation, you'd calculate actual storage used
      const snapshotCount = await this._prisma.snapshots.count({
        where: { user_id: userId },
      });

      // Estimate 10MB per snapshot (rough estimate)
      const estimatedStorageMB = snapshotCount * 10;
      const storageLimitGB = this.parseStorageSize(plan.storage_size || '5GB');
      const storageLimitMB = storageLimitGB * 1024;

      const percentage = storageLimitMB > 0 ? estimatedStorageMB / storageLimitMB : 0;

      this.logger.debug(`[checkStorageQuota] Storage usage check for user ${userId}`, {
        userId,
        snapshotCount,
        estimatedStorageMB,
        storageLimitGB,
        storageLimitMB,
        percentage: Math.round(percentage * 100),
        threshold: this.WARNING_THRESHOLDS.storage * 100,
        planCode: plan.code,
        storageSize: plan.storage_size,
      });

      if (percentage >= this.WARNING_THRESHOLDS.storage) {
        this.logger.warn(`[checkStorageQuota] Storage quota warning triggered for user ${userId}`, {
          userId,
          snapshotCount,
          estimatedStorageMB,
          storageLimitMB,
          percentage: Math.round(percentage * 100),
          planCode: plan.code,
        });

        return {
          type: 'storage',
          currentUsage: estimatedStorageMB,
          limit: storageLimitMB,
          percentage: Math.round(percentage * 100),
          planName: plan.name,
        };
      }

      return null;
    } catch (error) {
      this.logger.error(`[checkStorageQuota] Error checking storage quota for user ${userId}:`, {
        userId,
        planCode: plan.code,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Check caregiver quota usage
   */
  private async checkCaregiverQuota(userId: string, plan: any): Promise<QuotaWarning | null> {
    try {
      const caregiverCount = await this._prisma.caregiver_invitations.count({
        where: {
          customer_id: userId,
          is_active: true,
        },
      });

      const limit = plan.caregiver_seats || 0;
      const percentage = limit > 0 ? caregiverCount / limit : 0;

      this.logger.debug(`[checkCaregiverQuota] Caregiver usage check for user ${userId}`, {
        userId,
        caregiverCount,
        limit,
        percentage: Math.round(percentage * 100),
        threshold: this.WARNING_THRESHOLDS.caregiver * 100,
        planCode: plan.code,
      });

      if (percentage >= this.WARNING_THRESHOLDS.caregiver) {
        this.logger.warn(
          `[checkCaregiverQuota] Caregiver quota warning triggered for user ${userId}`,
          {
            userId,
            caregiverCount,
            limit,
            percentage: Math.round(percentage * 100),
            planCode: plan.code,
          },
        );

        return {
          type: 'caregiver',
          currentUsage: caregiverCount,
          limit,
          percentage: Math.round(percentage * 100),
          planName: plan.name,
        };
      }

      return null;
    } catch (error) {
      this.logger.error(
        `[checkCaregiverQuota] Error checking caregiver quota for user ${userId}:`,
        {
          userId,
          planCode: plan.code,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      return null;
    }
  }

  /**
   * Send quota warning notifications
   */
  private async sendQuotaWarnings(user: any, plan: any, warnings: QuotaWarning[]): Promise<void> {
    const startTime = Date.now();

    this.logger.debug(`[sendQuotaWarnings] Processing quota warnings for user ${user.user_id}`, {
      userId: user.user_id,
      planCode: plan.code,
      warningCount: warnings.length,
      warningTypes: warnings.map((w) => w.type),
    });

    // Check if we already sent quota warnings recently (within last 24 hours)
    const recentWarning = await this._prisma.notifications.findFirst({
      where: {
        user_id: user.user_id,
        business_type: 'quota_warning',
        created_at: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
    });

    if (recentWarning) {
      this.logger.log(
        `[sendQuotaWarnings] Skipping quota warning - already sent recently for user ${user.user_id}`,
        {
          userId: user.user_id,
          lastWarningId: recentWarning.notification_id,
          lastWarningDate: recentWarning.created_at?.toISOString(),
          hoursSinceLastWarning: Math.floor(
            (Date.now() - recentWarning.created_at.getTime()) / (1000 * 60 * 60),
          ),
          currentWarnings: warnings.length,
        },
      );
      return;
    }

    const warningMessages = warnings.map((w) => {
      switch (w.type) {
        case 'camera':
          return `Camera: ${w.currentUsage}/${w.limit} (${w.percentage}%)`;
        case 'storage':
          return `Storage: ${Math.round(w.currentUsage)}MB/${w.limit}MB (${w.percentage}%)`;
        case 'caregiver':
          return `Caregiver: ${w.currentUsage}/${w.limit} (${w.percentage}%)`;
        default:
          return '';
      }
    });

    const message = `Cảnh báo hạn mức sử dụng gói ${plan.name}:\n${warningMessages.join('\n')}\nVui lòng nâng cấp gói hoặc giảm sử dụng để tránh gián đoạn dịch vụ.`;

    this.logger.debug(
      `[sendQuotaWarnings] Creating quota warning notification for user ${user.user_id}`,
      {
        userId: user.user_id,
        planName: plan.name,
        warningCount: warnings.length,
        messagePreview: message.substring(0, 100) + '...',
      },
    );

    // Create notification record
    const notification = await this._prisma.notifications.create({
      data: {
        user_id: user.user_id,
        business_type: 'quota_warning',
        channel: 'push',
        message: message,
        status: 'pending',
        delivery_data: {
          plan_code: plan.code,
          plan_name: plan.name,
          warnings: warnings.map((w) => ({
            type: w.type,
            currentUsage: w.currentUsage,
            limit: w.limit,
            percentage: w.percentage,
            planName: w.planName,
          })),
        },
      },
    });

    this.logger.log(
      `[sendQuotaWarnings] Created quota warning notification ${notification.notification_id} for user ${user.user_id}`,
      {
        notificationId: notification.notification_id,
        userId: user.user_id,
        planCode: plan.code,
        warningCount: warnings.length,
        processingTimeMs: Date.now() - startTime,
      },
    );

    // Log individual quota warning activity
    await this._activityLogsService.create({
      actor_id: user.user_id,
      action: 'send_quota_warning',
      action_enum: ActivityAction.NOTIFY,
      resource_type: 'subscription',
      severity: ActivitySeverity.MEDIUM,
      message: `Gửi cảnh báo hạn mức sử dụng gói ${plan.name} cho user ${user.full_name ?? user.username}`,
      meta: {
        notificationId: notification.notification_id,
        planCode: plan.code,
        warningCount: warnings.length,
        warnings: warnings.map((w) => ({
          type: w.type,
          currentUsage: w.currentUsage,
          limit: w.limit,
          percentage: w.percentage,
        })),
      },
    });

    // Send push notification
    try {
      await this._fcmService.sendNotificationToUser(
        user.user_id,
        'Cảnh báo hạn mức sử dụng',
        `Bạn đang接近 hạn mức sử dụng gói ${plan.name}. Vui lòng kiểm tra!`,
        {
          type: 'quota_warning',
          plan_code: plan.code,
          warnings_count: warnings.length.toString(),
        },
      );

      this.logger.log(`[sendQuotaWarnings] Successfully sent FCM notification`, {
        notificationId: notification.notification_id,
        userId: user.user_id,
        fcmSendTimeMs: Date.now() - startTime,
      });
    } catch (error) {
      this.logger.error(`[sendQuotaWarnings] Failed to send FCM notification:`, {
        notificationId: notification.notification_id,
        userId: user.user_id,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        totalProcessingTimeMs: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * Parse storage size string (e.g., "5GB", "150GB") to number in GB
   */
  private parseStorageSize(storageSize: string): number {
    const match = storageSize.match(/(\d+)(GB|MB|TB)/i);
    if (!match) return 5; // Default 5GB

    const value = parseInt(match[1]);
    const unit = match[2].toUpperCase();

    switch (unit) {
      case 'TB':
        return value * 1024;
      case 'GB':
        return value;
      case 'MB':
        return value / 1024;
      default:
        return value;
    }
  }
}
