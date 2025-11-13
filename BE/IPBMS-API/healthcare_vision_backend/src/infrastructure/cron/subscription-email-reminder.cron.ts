import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import dayjs from 'dayjs';
import tz from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { SubscriptionReminderService } from '../../application/services/subscription';
import { SystemConfigService } from '../../application/services/system/system-config.service';
import { formatIsoLocal } from '../../shared/dates/iso-local';

dayjs.extend(utc);
dayjs.extend(tz);

@Injectable()
export class SubscriptionReminderCron {
  private readonly logger = new Logger(SubscriptionReminderCron.name);
  private lastTriggeredDate: string | null = null;
  private isRunning = false;
  private static instanceCounter = 0;
  private readonly instanceId: number;

  constructor(
    private readonly _reminderService: SubscriptionReminderService,
    private readonly _systemSettingsService: SystemConfigService,
  ) {
    this.instanceId = ++SubscriptionReminderCron.instanceCounter;
    this.logger.warn(
      `🚨 [INSTANCE] SubscriptionReminderCron instance #${this.instanceId} created (total: ${SubscriptionReminderCron.instanceCounter})`,
    );
  }

  // 🕒 Cron kiểm tra mỗi phút
  @Interval(60 * 1000)
  async checkAndTriggerReminder() {
    // Prevent concurrent executions
    if (this.isRunning) {
      this.logger.debug(
        `⏸️ [INSTANCE #${this.instanceId}] Cron is already running, skipping this tick`,
      );
      return;
    }

    this.isRunning = true;

    try {
      // Dùng giờ VN thay vì UTC
      const vnNow = dayjs().tz('Asia/Ho_Chi_Minh');
      const currentHour = vnNow.hour();
      const isoLocalNow = formatIsoLocal(vnNow.toDate());
      this.logger.debug(
        `🕒 [INSTANCE #${this.instanceId}] Cron tick at: ${isoLocalNow} VN (hour=${currentHour})`,
      );

      // Lấy cấu hình giờ VN từ DB, nếu không có hoặc không hợp lệ thì fallback sang env và sau đó default
      let configuredHourFromDb: number | null = null;
      try {
        configuredHourFromDb = await this._systemSettingsService.getInt(
          'subscription.expiry_notice_hour_vn',
        );
      } catch (err) {
        // Prisma P1001 (can't reach DB) and other DB errors may occur; handle gracefully
        this.logger.warn(
          `[INSTANCE #${this.instanceId}] Unable to read subscription.expiry_notice_hour_vn from DB - ${
            (err as Error).message || err
          }`,
        );
        configuredHourFromDb = null;
      }

      // Try env fallback
      const envFallbackRaw = process.env.SUBSCRIPTION_EXPIRY_NOTICE_HOUR_VN;
      const envFallback = envFallbackRaw ? parseInt(envFallbackRaw, 10) : NaN;

      // final fallback default hour (VN) if neither DB nor env provide valid number
      const DEFAULT_HOUR = 15;

      let configuredHour: number | null = null;
      if (typeof configuredHourFromDb === 'number' && !isNaN(configuredHourFromDb)) {
        configuredHour = configuredHourFromDb;
      } else if (!isNaN(envFallback)) {
        configuredHour = envFallback;
      } else {
        // Use default but still treat as fallback and warn
        configuredHour = DEFAULT_HOUR;
      }

      this.logger.debug(
        `⚙️ [INSTANCE #${this.instanceId}] Configured expiry notice hour (VN): db=${configuredHourFromDb} env=${envFallbackRaw} -> using=${configuredHour}`,
      );

      if (currentHour !== configuredHour) {
        this.logger.debug(
          `🛑 [INSTANCE #${this.instanceId}] Not time yet → skip this tick (now=${currentHour}, target=${configuredHour})`,
        );
        return;
      }

      const today = vnNow.format('YYYY-MM-DD');
      if (this.lastTriggeredDate === today) {
        this.logger.warn(
          `⚠️ [INSTANCE #${this.instanceId}] Already triggered today at hour=${configuredHour} → skip`,
        );
        return;
      }

      this.logger.log(
        `⏰ [INSTANCE #${this.instanceId}] Running subscription reminder at hour=${configuredHour} (VN)...`,
      );
      try {
        await this._reminderService.handleReminders();
        this.logger.log(
          `✅ [INSTANCE #${this.instanceId}] Subscription reminder job executed successfully`,
        );
      } catch (err) {
        // Do not let a runtime error from the reminder service crash the scheduler loop
        this.logger.error(
          `[INSTANCE #${this.instanceId}] Subscription reminder job failed: ${(err as Error).message || err}`,
        );
      }

      this.lastTriggeredDate = today;
    } finally {
      this.isRunning = false;
    }
  }
}
