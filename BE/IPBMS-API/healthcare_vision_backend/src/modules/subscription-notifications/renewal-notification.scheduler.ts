import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { RenewalNotificationService } from './renewal-notification.service';

@Injectable()
export class RenewalNotificationScheduler {
  private readonly logger = new Logger(RenewalNotificationScheduler.name);

  constructor(private readonly _renewalNotificationService: RenewalNotificationService) {}

  /**
   * Run daily at 9 AM to check for subscriptions expiring in 1 month
   */
  @Cron('0 9 * * *', { timeZone: 'Asia/Ho_Chi_Minh' })
  async sendRenewalNotifications() {
    const startTime = Date.now();
    const executionId = `renewal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    this.logger.log('[CRON] Starting renewal notification check...', {
      executionId,
      timestamp: new Date().toISOString(),
      cronSchedule: '0 9 * * * (daily at 9 AM ICT)',
      timeZone: 'Asia/Ho_Chi_Minh',
    });

    try {
      await this._renewalNotificationService.sendRenewalNotifications();

      const totalTime = Date.now() - startTime;
      this.logger.log('[CRON] Renewal notification check completed successfully', {
        executionId,
        totalTimeMs: totalTime,
        timestamp: new Date().toISOString(),
        status: 'success',
      });
    } catch (error) {
      const totalTime = Date.now() - startTime;
      this.logger.error('[CRON] Error during renewal notification check:', {
        executionId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        totalTimeMs: totalTime,
        timestamp: new Date().toISOString(),
        status: 'failed',
      });
    }
  }
}
