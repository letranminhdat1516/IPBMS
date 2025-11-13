import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { FcmService } from '../fcm.service';
import { EventConfirmationService } from '../event-confirmation.service';
import { getNotificationMessage, getNotificationType } from '../../../shared';

@Injectable()
export class EventNotificationScheduler {
  private readonly logger = new Logger(EventNotificationScheduler.name);

  constructor(
    private readonly _prisma: PrismaService,
    private readonly _fcmService: FcmService,
    private readonly _eventConfirmationService: EventConfirmationService,
  ) {}

  @Cron('*/5 * * * *', { timeZone: 'Asia/Ho_Chi_Minh' })
  async autoApprovePendingProposals() {
    this.logger.log(
      '[CRON] autoApprovePendingProposals is disabled by policy (silence != consent)',
    );
    return;
  }

  @Cron('*/1 * * * *', { timeZone: 'Asia/Ho_Chi_Minh' })
  async checkPendingEventNotifications() {
    this.logger.log('[CRON] Kiểm tra các sự kiện cần thông báo');

    try {
      const pendingEvents = await this._prisma.events.findMany({
        where: {},
        include: { cameras: { include: { users: true } } },
        take: 50,
        orderBy: { detected_at: 'asc' },
      });

      if (!pendingEvents || pendingEvents.length === 0) {
        this.logger.log('[CRON] Không có sự kiện cần thông báo');
        return;
      }

      this.logger.log(`[CRON] Tìm thấy ${pendingEvents.length} sự kiện cần thông báo`);

      // Process in configurable batches with a small concurrency limit to avoid DB/FCM spikes
      const defaultBatchSize = 50;
      const defaultConcurrency = 5;
      const batchSize =
        Number(process.env.EVENT_NOTIFICATION_BATCH_SIZE ?? defaultBatchSize) || defaultBatchSize;
      const concurrency =
        Number(process.env.EVENT_NOTIFICATION_CONCURRENCY ?? defaultConcurrency) ||
        defaultConcurrency;

      for (let i = 0; i < pendingEvents.length; i += batchSize) {
        const batch = pendingEvents.slice(i, i + batchSize);

        // Within each batch, run up to `concurrency` tasks in parallel.
        for (let j = 0; j < batch.length; j += concurrency) {
          const chunk = batch.slice(j, j + concurrency);
          await Promise.all(
            chunk.map(async (event: any) => {
              try {
                await this.processEventNotification(event);
              } catch (err) {
                this.logger.error(`[CRON] Lỗi khi xử lý event ${event.event_id}:`, err);
              }
            }),
          );
        }
      }
    } catch (error) {
      this.logger.error('[CRON] Lỗi khi kiểm tra sự kiện cần thông báo:', error);
    }
  }

  private async processEventNotification(event: any) {
    const user = event.cameras?.users;
    if (!user) {
      this.logger.warn(`[CRON] Event ${event.event_id} không có user liên kết`);
      return;
    }

    try {
      const notification = await this._prisma.notifications.create({
        data: {
          user_id: user.user_id,
          business_type: 'event_alert',
          channel: getNotificationType(event.event_type),
          message: getNotificationMessage(event),
          status: 'pending',
          delivery_data: {
            event_id: event.event_id,
            camera_id: event.camera_id,
            confidence_score: event.confidence_score,
            timestamp: event.detected_at,
          },
        },
      });

      this.logger.log(
        `[CRON] Đã tạo notification ${notification.notification_id} cho event ${event.event_id}`,
      );

      if (process.env.FCM_ENABLED === 'true') {
        try {
          await this._fcmService.pushSystemEvent(user.user_id, {
            eventId: event.event_id,
            eventType: event.event_type,
            title: getNotificationMessage(event),
            body: getNotificationMessage(event),
            extra:
              typeof notification.delivery_data === 'object' && notification.delivery_data !== null
                ? (notification.delivery_data as Record<string, string>)
                : {},
          });
        } catch (err) {
          this.logger.error(
            `[CRON] Lỗi khi gọi FcmService.pushSystemEvent cho notification ${notification.notification_id}:`,
            err,
          );
        }
      }
    } catch (error) {
      this.logger.error(`[CRON] Lỗi tạo notification cho event ${event.event_id}:`, error);
    }
  }

  // notification message helper moved to shared/notification-messages

  @Cron('0 0 2 * * *', { timeZone: 'Asia/Ho_Chi_Minh' })
  async cleanupOldNotifications() {
    this.logger.log('[CRON] Bắt đầu dọn dẹp thông báo cũ');
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      await this._prisma.notifications.deleteMany({
        where: { sent_at: { lt: thirtyDaysAgo }, status: { in: ['delivered'] } },
      });
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      await this._prisma.notifications.updateMany({
        where: { status: 'pending', AND: [{ sent_at: { lt: oneDayAgo } }] },
        data: { status: 'failed', error_message: 'Timeout - not sent within 24 hours' },
      });
    } catch (error) {
      this.logger.error('[CRON] Lỗi khi dọn dẹp thông báo:', error);
    }
  }
}
