import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Notification } from '../../../core/entities/notifications.entity';
import { FcmService } from '../../../application/services/fcm.service';
import { ActivityLogsService } from '../../../application/services/activity-logs.service';
import { ActivityAction, ActivitySeverity } from '../../../core/entities/activity_logs.entity';

@Injectable()
export class NotificationFcmListener {
  private readonly logger = new Logger(NotificationFcmListener.name);

  constructor(
    private readonly fcmService: FcmService,
    private readonly activityLogs: ActivityLogsService,
  ) {}

  @OnEvent('notification.created')
  async handleNotificationCreated(notification: Notification) {
    if (!notification?.user_id) return;

    try {
      const title = (notification as any).title || notification.message || 'Thông báo';
      const body = (notification as any).body || notification.message || '';
      const data = { notification_id: notification.notification_id } as any;
      // include delivery_data if present
      if ((notification as any).delivery_data)
        data.delivery_data = (notification as any).delivery_data;

      await this.fcmService.sendNotificationToUser(notification.user_id, title, body, data as any);
    } catch (error) {
      this.logger.error(
        `[NotificationFcmListener] Failed to send FCM for notification ${notification.notification_id}`,
        error instanceof Error ? error.stack : String(error),
      );
      try {
        await this.activityLogs.create({
          actor_id: notification.user_id,
          actor_name: 'system',
          action: 'notification_fcm_failed',
          action_enum: ActivityAction.UPDATE,
          resource_type: 'notification',
          resource_id: notification.notification_id,
          resource_name: notification.message || '',
          severity: ActivitySeverity.HIGH,
          message: `Failed to send FCM notification: ${
            error instanceof Error ? error.message : String(error)
          }`,
          meta: {
            notification_id: notification.notification_id,
            user_id: notification.user_id,
            error: error instanceof Error ? error.message : error,
          },
        });
      } catch (logErr) {
        // Ensure activity log failures do not crash the listener
        this.logger.error(
          `[NotificationFcmListener] Failed to create activity log for failed FCM ${notification.notification_id}`,
          logErr instanceof Error ? logErr.stack : String(logErr),
        );
      }
    }
  }
}
