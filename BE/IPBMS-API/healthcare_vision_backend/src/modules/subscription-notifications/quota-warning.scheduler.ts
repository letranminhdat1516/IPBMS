import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { QuotaWarningService } from './quota-warning.service';

@Injectable()
export class QuotaWarningScheduler {
  private readonly logger = new Logger(QuotaWarningScheduler.name);

  constructor(private readonly _quotaWarningService: QuotaWarningService) {}

  /**
   * Run daily at 10 AM to check quota usage
   */
  @Cron('0 10 * * *', { timeZone: 'Asia/Ho_Chi_Minh' })
  async checkQuotaWarnings() {
    const startTime = Date.now();
    const executionId = `quota-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    this.logger.log('[CRON] Starting quota warning check...', {
      executionId,
      timestamp: new Date().toISOString(),
      cronSchedule: '0 10 * * * (daily at 10 AM ICT)',
      timeZone: 'Asia/Ho_Chi_Minh',
    });

    try {
      await this._quotaWarningService.checkQuotaWarnings();

      const totalTime = Date.now() - startTime;
      this.logger.log('[CRON] Quota warning check completed successfully', {
        executionId,
        totalTimeMs: totalTime,
        timestamp: new Date().toISOString(),
        status: 'success',
      });
    } catch (error) {
      const totalTime = Date.now() - startTime;
      this.logger.error('[CRON] Error during quota warning check:', {
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
