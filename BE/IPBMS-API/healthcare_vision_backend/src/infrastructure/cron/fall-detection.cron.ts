import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { FallDetectionService } from '../../application/services/fall-detection.service';
import { formatIsoLocal } from '../../shared/dates/iso-local';

@Injectable()
export class FallDetectionScheduler {
  private readonly logger = new Logger(FallDetectionScheduler.name);
  private isRunning = false; // Mutex flag to prevent concurrent executions
  private static instanceCounter = 0; // Track number of instances
  private readonly instanceId: number;

  constructor(private readonly _falls: FallDetectionService) {
    this.instanceId = ++FallDetectionScheduler.instanceCounter;
    this.logger.warn(
      `🚨 [INSTANCE] FallDetectionScheduler instance #${this.instanceId} created (total: ${FallDetectionScheduler.instanceCounter})`,
    );
  }

  @Cron('*/10 * * * *', { timeZone: 'Asia/Ho_Chi_Minh' })
  async checkFalls() {
    // Prevent concurrent executions
    if (this.isRunning) {
      this.logger.debug(
        `⏸️ [INSTANCE #${this.instanceId}] Cron is already running, skipping this tick`,
      );
      return;
    }

    this.isRunning = true;

    try {
      this.logger.log(`🕒 [FD][#${this.instanceId}] check abnormal_behavior`);

      const users = await this._falls.findUsersWithRecentAbnormalEvents();
      if (!users.length) {
        this.logger.log(`✅ [FD][#${this.instanceId}] no recent abnormal_behavior users`);
        return;
      }

      const verbose = process.env.FALL_DETECTION_VERBOSE_LOG === 'true';

      for (const { user_id: userId } of users) {
        this.logger.log(`📍 [FD][#${this.instanceId}] user=${userId} check`);

        const shouldTrigger = await this._falls.hasUnhandledAbnormalStreak(userId);
        if (!shouldTrigger) {
          this.logger.log(`ℹ️ [FD][#${this.instanceId}] user=${userId} not eligible`);
          continue;
        }

        const latest = await this._falls.findLatestAbnormalEvent(userId);
        if (!latest) {
          this.logger.warn(`⚠️ [FD][#${this.instanceId}] user=${userId} no latest event`);
          continue;
        }

        // Build a concise summary for logging. detection_data and ai_analysis_result can be large,
        // so stringify and truncate to keep logs readable.
        const short = (obj: any, max = 200) => {
          if (obj === null || obj === undefined) return 'null';
          try {
            const s = typeof obj === 'string' ? obj : JSON.stringify(obj);
            return s.length > max ? s.slice(0, max) + '…' : s;
          } catch {
            return String(obj);
          }
        };

        const eventSummary = `eventId=${latest.event_id} detected_at=${formatIsoLocal(
          new Date(latest.detected_at),
        )} confidence=${latest.confidence_score ?? 'n/a'} desc=${
          latest.event_description ? short(latest.event_description, 120) : 'n/a'
        } detection=${short(latest.detection_data)} ai=${short(latest.ai_analysis_result)}`;

        this.logger.log(`🔎 [FD][#${this.instanceId}] ${eventSummary}`);

        if (verbose) {
          try {
            const payload = {
              event_id: latest.event_id,
              detected_at: latest.detected_at,
              confidence_score: latest.confidence_score ?? null,
              event_description: latest.event_description ?? null,
              detection_data: latest.detection_data ?? null,
              ai_analysis_result: latest.ai_analysis_result ?? null,
              context_data: latest.context_data ?? null,
              confirm_status: latest.confirm_status ?? null,
              status: latest.status ?? null,
            };
            this.logger.debug(
              `🔍 [INSTANCE #${this.instanceId}] VERBOSE event payload for user ${userId}: ${JSON.stringify(
                payload,
              )}`,
            );
          } catch {
            this.logger.error(
              `❌ [FD][#${this.instanceId}] failed to stringify verbose payload for user=${userId}`,
            );
          }
        }

        const result = await this._falls.handle({
          userId,
          eventId: latest.event_id,
        });

        if (result.thresholdReached) {
          if (result.alerted) {
            this.logger.log(
              `📞 [INSTANCE #${this.instanceId}] Đã gọi người thân cho user ${userId}, alertId=${result.alertId}`,
            );
          } else {
            this.logger.warn(
              `❌ [INSTANCE #${this.instanceId}] Không gọi được người thân cho user ${userId}`,
            );
          }
        }
      }

      this.logger.log(`✅ [FD][#${this.instanceId}] finished check abnormal_behavior`);
    } finally {
      this.isRunning = false;
    }
  }
}
