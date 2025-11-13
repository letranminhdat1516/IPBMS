// src/infrastructure/cron/activity-logs-cleanup.cron.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ActivityLogsService } from '../../application/services/activity-logs.service';

@Injectable()
export class ActivityLogsCleanupCron {
  private readonly logger = new Logger(ActivityLogsCleanupCron.name);

  constructor(private readonly activityLogsService: ActivityLogsService) {}

  // 🧹 Chạy cleanup mỗi ngày lúc 02:00 sáng UTC
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleCleanup() {
    this.logger.log('🧹 Starting daily cleanup for activity logs...');
    try {
      await this.activityLogsService.cleanupLogs();
      this.logger.log('✅ Daily cleanup for activity logs finished');
    } catch (error: any) {
      this.logger.error('❌ Failed to cleanup activity logs', error.stack);
    }
  }
}
