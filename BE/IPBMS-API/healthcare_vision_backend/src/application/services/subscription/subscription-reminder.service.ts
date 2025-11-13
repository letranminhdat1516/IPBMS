import { SubscriptionEventRepository } from '@/infrastructure/repositories/payments/subscription-event.repository';
import { subscription_event_type_enum } from '@prisma/client';
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import dayjs from 'dayjs';
import tz from 'dayjs/plugin/timezone';
import { formatIsoLocal } from '@/shared/dates/iso-local';
import { runWithAdvisoryLock } from '@/shared/utils';
import utc from 'dayjs/plugin/utc';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AlertsService } from '../notifications/alerts.service';
import { MailService } from '../notifications/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SystemConfigService } from '../system/system-config.service';

dayjs.extend(utc);
dayjs.extend(tz);

@Injectable()
export class SubscriptionReminderService {
  private readonly logger = new Logger(SubscriptionReminderService.name);

  constructor(
    private readonly _prisma: PrismaService,
    private readonly _mailService: MailService,
    private readonly _systemSettingsService: SystemConfigService,
    private readonly _alertsService: AlertsService,
    private readonly _notificationsService: NotificationsService,
    private readonly _subscriptionEventRepository: SubscriptionEventRepository,
  ) {}

  async handleReminders() {
    // Dùng mốc theo VN để tính daysLeft cho đúng expectation
    const vnNow = dayjs().tz('Asia/Ho_Chi_Minh').startOf('day');
    const utcNow = dayjs.utc();

    const daysBefore: number[] = await this._systemSettingsService.getJson(
      'subscription.expiry_notice_days_before',
    );
    const shouldSendToday: boolean = await this._systemSettingsService.getBoolean(
      'subscription.send_on_expiry_day',
    );

    const targetDays = Array.from(new Set([...(daysBefore ?? [])]));
    if (shouldSendToday && !targetDays.includes(0)) targetDays.push(0);

    const maxDay = targetDays.length ? Math.max(...targetDays) : 0;

    // Window query rộng theo UTC để “bắt” các bản ghi có thể khớp,
    // rồi lọc chính xác bằng daysLeft phía dưới.
    const fromDate = utcNow.subtract(1, 'day').startOf('day').toDate();
    const toDate = utcNow
      .add(maxDay + 1, 'day')
      .endOf('day')
      .toDate();

    // Operator-facing: show local ISO-like timestamps for clarity
    // Keep DB queries using UTC date objects (fromDate/toDate) unchanged
    const fromLocal = formatIsoLocal(fromDate);
    const toLocal = formatIsoLocal(toDate);
    this.logger.debug(
      `🔧 targetDays=${JSON.stringify(targetDays)}, vnNow=${vnNow.format('YYYY-MM-DD')}, window=[${fromLocal} → ${toLocal}]`,
    );

    const subscriptions = await this._prisma.subscriptions.findMany({
      where: {
        status: 'active',
        current_period_end: { gte: fromDate, lte: toDate },
        users: { is_active: true },
      },
      include: { users: true, plans: true },
    });

    this.logger.debug(`🔍 Found ${subscriptions.length} candidate subscriptions`);
    let sent = 0;

    // Throttle processing bằng cách chia thành batch nhỏ và xử lý mỗi batch song song
    const defaultBatchSize = 50;
    const batchSize =
      Number(process.env.SUBSCRIPTION_REMINDER_BATCH_SIZE ?? defaultBatchSize) || defaultBatchSize;

    // Process subscriptions in chunks to limit concurrent DB/IO load
    for (let i = 0; i < subscriptions.length; i += batchSize) {
      const batch = subscriptions.slice(i, i + batchSize);

      // Process each batch in parallel, but the batch size itself limits concurrency
      const results = (await Promise.all(
        batch.map(async (sub) => {
          if (!sub.current_period_end) {
            this.logger.warn(`⚠️ ${sub.subscription_id}: current_period_end is NULL → skip`);
            return 0;
          }

          // Tính daysLeft theo VN để khớp với kỳ vọng “D-0 là hôm nay theo giờ VN”
          const endVN = dayjs(sub.current_period_end).tz('Asia/Ho_Chi_Minh').startOf('day');
          const daysLeft = endVN.diff(vnNow, 'day');

          this.logger.debug(
            `➡️ ${sub.subscription_id} user=${sub.users?.email} plan=${sub.plans?.name} endVN=${endVN.format(
              'YYYY-MM-DD',
            )} daysLeft=${daysLeft}`,
          );

          if (!targetDays.includes(daysLeft)) {
            this.logger.debug(`   ↪️ Not a target day → skip`);
            return 0;
          }

          // Tạo alert cho subscription expiry reminder
          const alertMessage = `Subscription ${sub.plans?.name || 'Unknown Plan'} expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`;

          try {
            // Ensure idempotency: create a subscription history event if not exists for this reminder (daysLeft)
            const eventRecord =
              await this._subscriptionEventRepository.createIfNotExistsByEventData(
                sub.subscription_id,
                'created' as subscription_event_type_enum,
                'daysLeft',
                String(daysLeft),
                {
                  subscription_id: sub.subscription_id,
                  event_type: 'reminder',
                  event_subtype: 'expiry_notice',
                  event_data: {
                    subscription_id: sub.subscription_id,
                    plan_name: sub.plans?.name,
                    plan_code: sub.plans?.code,
                    expiry_date: sub.current_period_end,
                    days_left: daysLeft,
                  },
                  created_at: new Date(),
                } as any,
              );

            // If eventRecord already existed and was created earlier, skip duplicate notification
            const justCreated =
              eventRecord &&
              Math.abs(new Date().getTime() - new Date(eventRecord.created_at).getTime()) < 5000;
            if (!justCreated) {
              this.logger.debug(
                `↪️ Reminder already sent earlier for ${sub.subscription_id} daysLeft=${daysLeft} → skip`,
              );
              return 0;
            }

            const alert = await this._alertsService.create({
              event_id: sub.subscription_id, // Sử dụng subscription_id làm event_id
              user_id: sub.user_id,
              alert_type: 'info', // Temporary: sử dụng 'info' vì enum chưa có 'subscription_expiry'
              severity: daysLeft <= 1 ? 'high' : 'medium',
              alert_message: alertMessage,
              alert_data: {
                subscription_id: sub.subscription_id,
                plan_name: sub.plans?.name,
                plan_code: sub.plans?.code,
                expiry_date: sub.current_period_end,
                days_left: daysLeft,
              },
              status: 'active',
            });

            this.logger.debug(
              `🔔 Created alert ${alert.notification_id} for subscription ${sub.subscription_id}`,
            );

            // Tạo notification từ alert with retries
            await this.retry(async () => {
              await this._notificationsService.create({
                notification_id: alert.notification_id,
                user_id: sub.user_id,
                business_type: 'system_update',
                notification_type: 'email',
                message: alertMessage,
                delivery_data: {
                  email_template: 'subscription_expiry',
                  subscription_id: sub.subscription_id,
                  days_left: daysLeft,
                },
              });
            }, 3);

            this.logger.debug(`📱 Created notification for alert ${alert.notification_id}`);
          } catch (alertError) {
            this.logger.error(
              `❌ Failed to create alert/notification for subscription ${sub.subscription_id}:`,
              alertError,
            );
            // Vẫn tiếp tục gửi email nếu tạo alert thất bại
          }

          // Gửi mail
          const res = await this.retry(async () =>
            this._mailService.sendSubscriptionExpiryNotice(
              sub.users.email,
              sub.users.full_name,
              sub.plans?.name || 'Unknown Plan',
              sub.current_period_end as Date, // Date
              daysLeft,
            ),
          );

          this.logger.log(
            `📨 Send to ${sub.users.email} (daysLeft=${daysLeft}) → ${res.success ? 'OK' : 'FAIL'}`,
          );
          if (!res.success) this.logger.error(`   reason: ${res.error}`);

          return res.success ? 1 : 0;
        }),
      )) as number[];

      // Sum results from this batch
      sent += results.reduce((a, b) => a + b, 0);
    }

    this.logger.log(`✅ handleReminders finished. sent=${sent}`);
    return { success: true, sent };
  }

  /**
   * Simple retry helper with exponential backoff. fn should return a promise.
   */
  private async retry<T>(fn: () => Promise<T>, attempts = 3, baseDelayMs = 500): Promise<T> {
    let lastErr: any = null;
    for (let i = 1; i <= attempts; i++) {
      try {
        return await fn();
      } catch (err) {
        lastErr = err;
        const delay = baseDelayMs * Math.pow(2, i - 1);
        this.logger.warn(`Retry ${i}/${attempts} failed; retrying in ${delay}ms.`);
        this.logger.warn((err as Error)?.message || '');
        // small delay
        await new Promise((r) => setTimeout(r, delay));
      }
    }
    // If we reach here, all attempts failed
    throw lastErr;
  }

  /**
   * Cron job chạy mỗi ngày lúc 9AM để check license expiry và tạo alerts
   * Chạy tự động để monitor subscription status
   */
  @Cron('0 9 * * *', { timeZone: 'Asia/Ho_Chi_Minh' }) // Mỗi ngày 9:00 AM (VN)
  async checkLicenseExpiry() {
    this.logger.log('🔍 Starting license expiry check...');

    try {
      await this.handleReminders();
      this.logger.log('✅ License expiry check completed successfully');
    } catch (error) {
      this.logger.error('❌ License expiry check failed:', error);
    }
  }

  /**
   * Cron job chạy mỗi giờ để check subscription status changes
   * Monitor các subscription chuyển từ active -> past_due -> suspended
   */
  @Cron('0 * * * *', { timeZone: 'Asia/Ho_Chi_Minh' }) // Mỗi giờ (VN)
  async checkSubscriptionStatusChanges() {
    this.logger.log('🔄 Checking subscription status changes...');

    try {
      // Tìm subscriptions ở trạng thái past_due (cần payment)
      const pastDueSubscriptions = await this._prisma.subscriptions.findMany({
        where: {
          status: 'past_due',
        },
        include: { users: true, plans: true },
      });

      // Chỉ tạo alert cho subscriptions past_due chưa có alert gần đây
      for (const sub of pastDueSubscriptions) {
        await this.createSubscriptionStatusAlert(sub, 'past_due');
      }

      // Tìm subscriptions bị suspended/canceled
      const suspendedSubscriptions = await this._prisma.subscriptions.findMany({
        where: {
          status: 'canceled',
        },
        include: { users: true, plans: true },
      });

      for (const sub of suspendedSubscriptions) {
        await this.createSubscriptionStatusAlert(sub, 'suspended');
      }

      this.logger.log(
        `✅ Checked ${pastDueSubscriptions.length + suspendedSubscriptions.length} status changes`,
      );
    } catch (error) {
      this.logger.error('❌ Subscription status check failed:', error);
    }
  }

  /**
   * Cron job chạy mỗi ngày để thực hiện dunning process
   * Chuyển subscriptions từ past_due -> grace -> suspended theo thời gian
   */
  @Cron('0 2 * * *', { timeZone: 'Asia/Ho_Chi_Minh' }) // Mỗi ngày 2:00 AM (VN)
  async processDunningWorkflow() {
    this.logger.log('🔄 Starting dunning process workflow...');

    try {
      await this.processPastDueToGrace();
      await this.processGraceToSuspended();

      this.logger.log('✅ Dunning process workflow completed');
    } catch (error) {
      this.logger.error('❌ Dunning process workflow failed:', error);
    }
  }

  /**
   * Chuyển subscriptions từ past_due sang grace sau 2 ngày
   */
  private async processPastDueToGrace() {
    this.logger.log('🔄 Processing past_due -> grace transitions...');

    const gracePeriodStartDays = 2; // Fixed 2 ngày cho simplicity

    const cutoffDate = dayjs().subtract(gracePeriodStartDays, 'day').toDate();

    // Tìm subscriptions past_due có last_payment_at cũ hơn cutoffDate
    const subscriptionsToMove = await this._prisma.subscriptions.findMany({
      where: {
        status: 'past_due',
        OR: [{ last_payment_at: { lte: cutoffDate } }, { last_payment_at: null }],
      },
      include: { users: true, plans: true },
    });

    this.logger.log(`📊 Found ${subscriptionsToMove.length} subscriptions to move to grace`);

    for (const sub of subscriptionsToMove) {
      try {
        await this._prisma.subscriptions.update({
          where: { subscription_id: sub.subscription_id },
          data: { status: 'paused' },
        });

        // Log subscription event (idempotent)
        try {
          await runWithAdvisoryLock(this._prisma, sub.subscription_id, async (tx) => {
            return this._subscriptionEventRepository.createIfNotExistsByEventDataInTransaction(
              tx,
              sub.subscription_id,
              'paused',
              'entered_at',
              String(new Date().toISOString()),
              {
                subscription_id: sub.subscription_id,
                event_type: 'paused',
                event_data: {
                  previous_status: 'past_due',
                  new_status: 'grace',
                  grace_period_days: 7,
                  entered_at: new Date(),
                },
              } as any,
            );
          });
        } catch (err) {
          this.logger.error(
            `Failed to log paused event idempotently for ${sub.subscription_id}:`,
            err,
          );
        }

        // Tạo alert cho grace period
        await this.createSubscriptionStatusAlert(sub, 'grace');

        this.logger.log(`✅ Moved subscription ${sub.subscription_id} to grace`);
      } catch (error) {
        this.logger.error(`❌ Failed to move subscription ${sub.subscription_id} to grace:`, error);
      }
    }
  }

  /**
   * Chuyển subscriptions từ grace sang suspended sau 7 ngày
   */
  private async processGraceToSuspended() {
    this.logger.log('🔄 Processing grace -> suspended transitions...');

    const gracePeriodDays = 7; // Fixed 7 ngày

    const cutoffDate = dayjs().subtract(gracePeriodDays, 'day').toDate();

    const subscriptionsToSuspend = await this._prisma.subscriptions.findMany({
      where: {
        status: 'paused',
        OR: [{ last_payment_at: { lte: cutoffDate } }, { last_payment_at: null }],
      },
      include: { users: true, plans: true },
    });

    this.logger.log(`📊 Found ${subscriptionsToSuspend.length} subscriptions to suspend`);

    for (const sub of subscriptionsToSuspend) {
      try {
        await this._prisma.subscriptions.update({
          where: { subscription_id: sub.subscription_id },
          data: { status: 'suspended' },
        });

        // Log subscription event (idempotent)
        try {
          await runWithAdvisoryLock(this._prisma, sub.subscription_id, async (tx) => {
            return this._subscriptionEventRepository.createIfNotExistsByEventDataInTransaction(
              tx,
              sub.subscription_id,
              'canceled',
              'suspended_at',
              String(new Date().toISOString()),
              {
                subscription_id: sub.subscription_id,
                event_type: 'canceled',
                event_data: {
                  previous_status: 'grace',
                  new_status: 'suspended',
                  suspended_at: new Date(),
                  reason: 'grace_period_expired',
                },
              } as any,
            );
          });
        } catch (err) {
          this.logger.error(
            `Failed to log canceled event idempotently for ${sub.subscription_id}:`,
            err,
          );
        }

        // Tạo alert cho suspension
        await this.createSubscriptionStatusAlert(sub, 'suspended');

        this.logger.log(`✅ Suspended subscription ${sub.subscription_id}`);
      } catch (error) {
        this.logger.error(`❌ Failed to suspend subscription ${sub.subscription_id}:`, error);
      }
    }
  }

  /**
   * Tạo alert cho subscription status changes
   */
  private async createSubscriptionStatusAlert(subscription: any, status: string) {
    let alertType: string;
    let severity: string;
    let message: string;

    switch (status) {
      case 'past_due':
        alertType = 'license_payment_required';
        severity = 'high';
        message = `Your ${subscription.plans?.name || 'subscription'} requires payment to continue.`;
        break;
      case 'grace':
        alertType = 'license_payment_required';
        severity = 'high';
        message = `Your ${subscription.plans?.name || 'subscription'} is in grace period. Please complete payment within 7 days to avoid suspension.`;
        break;
      case 'suspended':
        alertType = 'account_suspended';
        severity = 'critical';
        message = `Your ${subscription.plans?.name || 'subscription'} has been suspended due to non-payment.`;
        break;
      default:
        alertType = 'info';
        severity = 'medium';
        message = `Your subscription status has changed to ${status}.`;
    }

    try {
      // Tạo alert
      const alert = await this._alertsService.create({
        event_id: subscription.subscription_id,
        user_id: subscription.user_id,
        alert_type: alertType,
        severity: severity,
        alert_message: message,
        alert_data: {
          subscription_id: subscription.subscription_id,
          plan_name: subscription.plans?.name,
          plan_code: subscription.plans?.code,
          status_change: status,
          changed_at: new Date(),
        },
        status: 'active',
      });

      // Tạo notification
      await this._notificationsService.create({
        notification_id: alert.notification_id,
        user_id: subscription.user_id,
        business_type: 'system_update',
        notification_type: 'push',
        message: message,
        delivery_data: {
          alert_type: alertType,
          subscription_id: subscription.subscription_id,
          action_required:
            status === 'past_due' || status === 'grace' ? 'complete_payment' : 'contact_support',
        },
      });

      this.logger.log(
        `🔔 Created ${status} alert for subscription ${subscription.subscription_id}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Failed to create ${status} alert for subscription ${subscription.subscription_id}:`,
        error,
      );
    }
  }
}
