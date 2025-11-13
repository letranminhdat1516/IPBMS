import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { FcmService } from '../../application/services/notifications/fcm.service';
import { ActivityLogsService } from '../../application/services/shared/activity-logs.service';
import { ActivityAction, ActivitySeverity } from '../../core/entities/activity_logs.entity';

@Injectable()
export class RenewalNotificationService {
  private readonly logger = new Logger(RenewalNotificationService.name);

  constructor(
    private readonly _prisma: PrismaService,
    private readonly _fcmService: FcmService,
    private readonly _activityLogsService: ActivityLogsService,
  ) {}

  /**
   * Send renewal notifications to users whose subscriptions expire in 1 month
   */
  async sendRenewalNotifications(): Promise<void> {
    const startTime = Date.now();
    this.logger.log('[sendRenewalNotifications] Starting renewal notification check...', {
      timestamp: new Date().toISOString(),
    });

    // Log activity start
    await this._activityLogsService.create({
      action: 'send_renewal_notifications_start',
      action_enum: ActivityAction.NOTIFY,
      resource_type: 'subscription',
      severity: ActivitySeverity.INFO,
      message: 'Bắt đầu gửi thông báo gia hạn subscription',
    });

    try {
      // Calculate date 1 month from now
      const oneMonthFromNow = new Date();
      oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

      const now = new Date();
      this.logger.debug('[sendRenewalNotifications] Date calculation', {
        now: now.toISOString(),
        oneMonthFromNow: oneMonthFromNow.toISOString(),
        checkWindowDays: Math.ceil(
          (oneMonthFromNow.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        ),
      });

      // Find active subscriptions expiring within the next 30 days
      const expiringSubscriptions = await this._prisma.subscriptions.findMany({
        where: {
          status: { in: ['active', 'trialing'] },
          current_period_end: {
            lte: oneMonthFromNow,
            gte: new Date(), // Not already expired
          },
        },
        include: {
          users: true,
          plans: true,
        },
      });

      this.logger.log(
        `[sendRenewalNotifications] Found ${expiringSubscriptions.length} subscriptions expiring soon`,
        {
          subscriptionCount: expiringSubscriptions.length,
          checkDate: oneMonthFromNow.toISOString(),
          queryTimeMs: Date.now() - startTime,
        },
      );

      let successCount = 0;
      let errorCount = 0;

      for (const subscription of expiringSubscriptions) {
        try {
          await this.sendRenewalNotificationForSubscription(subscription);
          successCount++;
        } catch (error) {
          this.logger.error(
            `[sendRenewalNotifications] Error sending renewal notification for subscription ${subscription.subscription_id}:`,
            {
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
      this.logger.log('[sendRenewalNotifications] Processing completed', {
        totalSubscriptions: expiringSubscriptions.length,
        successCount,
        errorCount,
        totalTimeMs: totalTime,
        averageTimePerSubscription:
          expiringSubscriptions.length > 0 ? totalTime / expiringSubscriptions.length : 0,
      });

      // Log activity completion
      await this._activityLogsService.create({
        action: 'send_renewal_notifications_complete',
        action_enum: ActivityAction.NOTIFY,
        resource_type: 'subscription',
        severity: ActivitySeverity.INFO,
        message: `Hoàn thành gửi thông báo gia hạn: ${successCount} thành công, ${errorCount} lỗi`,
        meta: {
          totalSubscriptions: expiringSubscriptions.length,
          successCount,
          errorCount,
          totalTimeMs: totalTime,
        },
      });
    } catch (error) {
      this.logger.error('[sendRenewalNotifications] Fatal error:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        processingTimeMs: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * Send renewal notification for a specific subscription
   */
  private async sendRenewalNotificationForSubscription(subscription: any): Promise<void> {
    const startTime = Date.now();
    const user = subscription.users;
    const plan = subscription.plans;

    this.logger.debug(
      `[sendRenewalNotification] Processing subscription ${subscription.subscription_id}`,
      {
        subscriptionId: subscription.subscription_id,
        userId: subscription.user_id,
        planCode: plan?.code,
        currentPeriodEnd: subscription.current_period_end?.toISOString(),
      },
    );

    if (!user || !plan) {
      this.logger.warn(
        `[sendRenewalNotification] Missing user or plan data for subscription ${subscription.subscription_id}`,
        {
          hasUser: !!user,
          hasPlan: !!plan,
          userId: subscription.user_id,
          planId: subscription.plan_id,
        },
      );
      return;
    }

    // Check if we already sent a renewal notification recently (within last 7 days)
    const recentNotification = await this._prisma.notifications.findFirst({
      where: {
        user_id: user.user_id,
        business_type: 'subscription_renewal',
        created_at: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
    });

    if (recentNotification) {
      this.logger.log(
        `[sendRenewalNotification] Skipping - already sent renewal notification recently for user ${user.user_id}`,
        {
          userId: user.user_id,
          subscriptionId: subscription.subscription_id,
          lastNotificationId: recentNotification.notification_id,
          lastNotificationDate: recentNotification.created_at?.toISOString(),
          daysSinceLastNotification: Math.floor(
            (Date.now() - recentNotification.created_at.getTime()) / (1000 * 60 * 60 * 24),
          ),
        },
      );
      return;
    }

    const daysUntilExpiry = Math.ceil(
      (subscription.current_period_end.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );

    const message = `Gói dịch vụ ${plan.name} của bạn sẽ hết hạn trong ${daysUntilExpiry} ngày. Vui lòng gia hạn để tiếp tục sử dụng dịch vụ.`;

    this.logger.debug(`[sendRenewalNotification] Creating notification for user ${user.user_id}`, {
      userId: user.user_id,
      planName: plan.name,
      daysUntilExpiry,
      expiryDate: subscription.current_period_end.toISOString(),
    });

    // Create notification record
    const notification = await this._prisma.notifications.create({
      data: {
        user_id: user.user_id,
        business_type: 'subscription_renewal',
        channel: 'push',
        message: message,
        status: 'pending',
        delivery_data: {
          subscription_id: subscription.subscription_id,
          plan_code: plan.code,
          plan_name: plan.name,
          expiry_date: subscription.current_period_end.toISOString(),
          days_until_expiry: daysUntilExpiry,
        },
      },
    });

    this.logger.log(
      `[sendRenewalNotification] Created renewal notification ${notification.notification_id} for user ${user.user_id}`,
      {
        notificationId: notification.notification_id,
        userId: user.user_id,
        subscriptionId: subscription.subscription_id,
        planCode: plan.code,
        daysUntilExpiry,
        processingTimeMs: Date.now() - startTime,
      },
    );

    // Log individual notification activity
    await this._activityLogsService.create({
      actor_id: user.user_id,
      action: 'send_renewal_notification',
      action_enum: ActivityAction.NOTIFY,
      resource_type: 'subscription',
      resource_id: subscription.subscription_id,
      severity: ActivitySeverity.INFO,
      message: `Gửi thông báo gia hạn subscription ${plan.name} cho user ${user.full_name ?? user.username}`,
      meta: {
        notificationId: notification.notification_id,
        planCode: plan.code,
        daysUntilExpiry,
        expiryDate: subscription.current_period_end.toISOString(),
      },
    });

    // Send push notification
    try {
      await this._fcmService.sendNotificationToUser(
        user.user_id,
        'Thông báo gia hạn gói dịch vụ',
        message,
        {
          type: 'subscription_renewal',
          subscription_id: subscription.subscription_id,
          plan_code: plan.code,
          expiry_date: subscription.current_period_end.toISOString(),
        },
      );

      this.logger.log(`[sendRenewalNotification] Successfully sent FCM notification`, {
        notificationId: notification.notification_id,
        userId: user.user_id,
        fcmSendTimeMs: Date.now() - startTime,
      });
    } catch (error) {
      this.logger.error(`[sendRenewalNotification] Failed to send FCM notification:`, {
        notificationId: notification.notification_id,
        userId: user.user_id,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        totalProcessingTimeMs: Date.now() - startTime,
      });
      throw error;
    }
  }
}
