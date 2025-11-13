import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EventsService } from '../application/services/events/events.service';
import { NotificationsService } from '../application/services/notifications/notifications.service';
import { ActivityLogsService } from '../application/services/shared/activity-logs.service';
import { SettingsService } from '../application/services/system/settings.service';
import { ActivitySeverity } from '../core/entities/activity_logs.entity';
import { buildActivityPayload } from '../shared/utils';
import { EventLifecycleEnum } from '../core/entities/events.entity';
import { PrismaService } from '../infrastructure/database/prisma.service';
import { EventsRepository } from '../infrastructure/repositories/events/events.repository';
import { ConfirmationStateEnum } from '@/core/entities/event_detections.entity';

@Injectable()
export class EventEscalationWorker {
  private readonly logger = new Logger(EventEscalationWorker.name);

  // Cache for settings to reduce database calls
  private settingsCache: {
    thresholds: Record<string, number>;
    forwardMode: string;
    lastUpdated: Date;
    ttl: number; // 5 minutes TTL
  } = {
    thresholds: {},
    forwardMode: 'timeout',
    lastUpdated: new Date(0),
    ttl: 5 * 60 * 1000, // 5 minutes
  };

  constructor(
    private readonly _prisma: PrismaService,
    private readonly _eventsRepo: EventsRepository,
    private readonly _eventsService: EventsService,
    private readonly _notificationsService: NotificationsService,
    private readonly _settingsService?: SettingsService,
    private readonly _activity?: ActivityLogsService,
  ) {}

  /**
   * Get cached settings with TTL to reduce database calls
   */
  private async getCachedSettings(): Promise<{
    thresholds: Record<string, number>;
    forwardMode: string;
  }> {
    const now = new Date();
    const cacheAge = now.getTime() - this.settingsCache.lastUpdated.getTime();

    // Return cached settings if still valid
    if (
      cacheAge < this.settingsCache.ttl &&
      Object.keys(this.settingsCache.thresholds).length > 0
    ) {
      return {
        thresholds: { ...this.settingsCache.thresholds },
        forwardMode: this.settingsCache.forwardMode,
      };
    }

    // Cache expired or empty, refresh from database
    const DEFAULT_SECONDS = 30;
    const MIN_SECONDS = 30;
    const MAX_SECONDS = 60;

    const envDefault = Number(process.env.EVENT_FORWARD_TIMEOUT_SECONDS);
    const baseDefault =
      Number.isFinite(envDefault) && !Number.isNaN(envDefault) ? envDefault : DEFAULT_SECONDS;

    const thresholdsSeconds: Record<string, number> = {
      emergency: baseDefault,
      fall: baseDefault,
      abnormal_behavior: baseDefault,
      normal_activity: baseDefault,
      sleep: baseDefault,
    };

    const clamp = (v: number) => Math.max(MIN_SECONDS, Math.min(MAX_SECONDS, Math.floor(v)));
    const applyOverride = (key: string, val: any) => {
      const n = Number(val);
      if (!Number.isFinite(n) || Number.isNaN(n)) return;
      if (Object.prototype.hasOwnProperty.call(thresholdsSeconds, key)) {
        thresholdsSeconds[key] = clamp(n);
      }
    };

    // Load from SettingsService
    try {
      if (this._settingsService && typeof this._settingsService.get === 'function') {
        const s = await this._settingsService.get('event_forward_thresholds').catch(() => null);
        if (s && (s as any).value) {
          const raw = (s as any).value;
          try {
            const parsed = JSON.parse(raw);
            if (typeof parsed === 'object' && parsed !== null) {
              Object.keys(parsed).forEach((k) => applyOverride(k, (parsed as any)[k]));
            } else if (!Number.isNaN(Number(parsed))) {
              Object.keys(thresholdsSeconds).forEach(
                (k) => (thresholdsSeconds[k] = clamp(Number(parsed))),
              );
            }
          } catch {
            applyOverride('emergency', raw);
            applyOverride('fall', raw);
            applyOverride('abnormal_behavior', raw);
            applyOverride('normal_activity', raw);
            applyOverride('sleep', raw);
          }
        }
      }
    } catch {}

    // ENV override (JSON)
    try {
      const envJson = process.env.EVENT_FORWARD_THRESHOLDS;
      if (envJson) {
        const parsed = JSON.parse(envJson);
        if (typeof parsed === 'object' && parsed !== null) {
          Object.keys(parsed).forEach((k) => applyOverride(k, (parsed as any)[k]));
        }
      }
    } catch {}

    // Load forward mode
    let forwardMode = 'timeout';
    try {
      if (this._settingsService && typeof this._settingsService.get === 'function') {
        const s = await this._settingsService.get('event_forward_mode').catch(() => null);
        if (s && (s as any).value) forwardMode = String((s as any).value).toLowerCase();
      }
    } catch {}
    forwardMode = String(process.env.EVENT_FORWARD_MODE || forwardMode || 'timeout').toLowerCase();

    // Update cache
    this.settingsCache = {
      thresholds: { ...thresholdsSeconds },
      forwardMode,
      lastUpdated: now,
      ttl: this.settingsCache.ttl,
    };

    return { thresholds: thresholdsSeconds, forwardMode };
  }

  @Cron('*/1 * * * *')
  async handleEscalations() {
    this.logger.debug('[handleEscalations] Checking for events to escalate');
    let gotLock = false;
    const lockKey = 'event_escalation_worker';
    try {
      try {
        const lockRes: any = await this._prisma.$queryRaw`
          SELECT pg_try_advisory_lock(hashtext(${lockKey})) as got
        `;
        gotLock = Array.isArray(lockRes) ? !!lockRes[0]?.got : !!(lockRes as any)?.got;
        if (!gotLock) {
          this.logger.debug('[handleEscalations] Another worker is running, skipping this tick');
          return;
        }
      } catch (lockErr) {
        this.logger.warn('[handleEscalations] Could not acquire advisory lock: ' + String(lockErr));
      }
      // Find events in PENDING verification that are older than configured timeout
      // We'll base timeout on event_type; fallback to created_at if pending_since is null.
      const now = new Date();

      // Get cached settings instead of loading every time
      const { thresholds: thresholdsSeconds, forwardMode } = await this.getCachedSettings();

      // Use repository-level selection that applies per-type thresholds and forwardMode
      // so the worker receives only candidate rows that already meet escalation criteria.
      // This reduces CPU work here and centralizes SQL tuning in the repository.
      const MIN_ATTEMPTS = Number(process.env.EVENT_FORWARD_MIN_ATTEMPTS) || 3;
      const LIMIT = Number(process.env.EVENT_FORWARD_LIMIT) || 500;

      const rows: any[] = (await this._eventsRepo.findEventsToEscalate(
        thresholdsSeconds,
        forwardMode as any,
        MIN_ATTEMPTS,
        LIMIT,
      )) as any[];

      if (!rows || rows.length === 0) {
        this.logger.debug('[handleEscalations] No pending events found');
        return;
      }

      // Process events in limited-size parallel batches to reduce wall-time while avoiding
      // overwhelming the DB or downstream services. Batch size is conservative and configurable.
      // OPTIMIZATION: Process batches in parallel instead of sequentially for better performance
      const BATCH_SIZE = Number(process.env.EVENT_ESCALATION_BATCH_SIZE) || 20;
      const batches: any[][] = [];
      for (let i = 0; i < rows.length; i += BATCH_SIZE) batches.push(rows.slice(i, i + BATCH_SIZE));

      let processed = 0;
      let escalated = 0;
      let skipped = 0;

      const processRow = async (
        r: any,
        thresholdsSeconds: Record<string, number>,
        forwardMode: string,
        now: Date,
        MIN_ATTEMPTS: number,
      ) => {
        processed++;
        const eventId: string = r.event_id;
        const eventType: string = r.event_type || 'normal_activity';
        const baseTime = r.base_time ? new Date(r.base_time) : null;
        const escalationCount: number =
          typeof r.escalation_count === 'number' ? r.escalation_count : 0;
        const status = (r.status || null) as string | null;
        const notificationAttempts: number =
          typeof r.notification_attempts === 'number' ? r.notification_attempts : 0;

        const threshold = thresholdsSeconds[eventType] ?? thresholdsSeconds['normal_activity'];
        if (!baseTime) return;

        const elapsedSec = Math.floor((now.getTime() - baseTime.getTime()) / 1000);
        const shouldForwardByAttempts =
          forwardMode === 'attempts' && notificationAttempts >= MIN_ATTEMPTS;
        const shouldForwardByTimeout = elapsedSec >= threshold;
        if (!shouldForwardByAttempts && !shouldForwardByTimeout) {
          skipped++;
          return;
        }

        try {
          const lifecycleState = (r.lifecycle_state || null) as string | null;
          const confirmationState = (r.confirmation_state || null) as string | null;
          const acknowledgedAt = r.acknowledged_at ? new Date(r.acknowledged_at) : null;
          const terminalLifecycle: string[] = [
            String(EventLifecycleEnum.AUTOCALLED),
            String(EventLifecycleEnum.ALARM_ACTIVATED),
            String(EventLifecycleEnum.ACKNOWLEDGED),
            String(EventLifecycleEnum.EMERGENCY_RESPONSE_RECEIVED),
            String(EventLifecycleEnum.RESOLVED),
            String(EventLifecycleEnum.EMERGENCY_ESCALATION_FAILED),
          ];

          if (
            confirmationState === ConfirmationStateEnum.CONFIRMED_BY_CUSTOMER ||
            confirmationState === ConfirmationStateEnum.REJECTED_BY_CUSTOMER ||
            acknowledgedAt ||
            (lifecycleState && terminalLifecycle.includes(String(lifecycleState)))
          ) {
            const verbose =
              String(process.env.EVENT_ESCALATION_VERBOSE || 'false').toLowerCase() === 'true';
            if (verbose) {
              this.logger.debug(
                `[handleEscalations] Bỏ qua việc leo thang cho ${eventId} vì đã được xử lý (lifecycle=${lifecycleState}, confirmation=${confirmationState}, acknowledged_at=${acknowledgedAt})`,
              );
            }
            return;
          }
        } catch (guardErr) {
          this.logger.warn(
            `[handleEscalations] Warning while evaluating guard for ${r.event_id}: ${String(guardErr)}`,
          );
        }

        if (!status || !['danger', 'warning'].includes(String(status))) {
          if (notificationAttempts && !['danger', 'warning'].includes(String(status))) {
            try {
              await this._prisma.events.update({
                where: { event_id: eventId },
                data: { notification_attempts: 0 } as any,
              });
            } catch {}
          }
          return;
        }

        this.logger.log(`[handleEscalations] Escalating event ${eventId} (type=${eventType})`);
        try {
          let modeTriggered: 'attempts' | 'timeout' | null = null;
          if (shouldForwardByAttempts && forwardMode === 'attempts') modeTriggered = 'attempts';
          else if (shouldForwardByTimeout && forwardMode === 'timeout') modeTriggered = 'timeout';
          else if (shouldForwardByAttempts) modeTriggered = 'attempts';
          else if (shouldForwardByTimeout) modeTriggered = 'timeout';

          const autoReason =
            modeTriggered === 'attempts' ? 'auto_escalation_attempts' : 'auto_escalation_timeout';

          await this._prisma.$transaction(async (tx) => {
            await tx.events.update({
              where: { event_id: eventId },
              data: {
                ['escalation_count']: { increment: 1 },
                ['escalated_at']: new Date(),
                ['auto_escalation_reason']: autoReason,
              } as any,
            });

            await tx.$executeRaw`
              UPDATE event_detections SET verification_status = 'ESCALATED'::event_verification_status_enum WHERE event_id = ${eventId}::uuid
            `;

            await tx.event_history.create({
              data: {
                event_id: eventId,
                action: 'escalated' as any,
                actor_id: null,
                reason: autoReason,
                previous_status: 'PENDING',
                new_status: 'ESCALATED',
                metadata: {
                  forward_mode: modeTriggered,
                  threshold_seconds: threshold,
                  notification_attempts: notificationAttempts,
                  elapsed_seconds: elapsedSec,
                },
                created_at: new Date(),
              },
            });
          });

          try {
            // Create an activity log entry for this auto-escalation (best-effort)
            try {
              const activityPayload = buildActivityPayload({
                actor_id: null,
                actor_name: 'event-escalation-worker',
                action: `escalation_${modeTriggered ?? 'auto'}`,
                resource_type: 'event',
                resource_id: eventId,
                resource_name: `event:${eventId}`,
                message: `Auto-escalation (${modeTriggered}) for event ${eventId}`,
                severity: ActivitySeverity.HIGH,
                meta: {
                  forward_mode: modeTriggered,
                  threshold_seconds: threshold,
                  notification_attempts: notificationAttempts,
                  elapsed_seconds: elapsedSec,
                },
              });

              // Use force to ensure system-level escalations are always recorded
              await this._activity?.create(activityPayload, { force: true });
            } catch (actErr) {
              this.logger.warn(
                `[handleEscalations] Failed to record activity log for ${eventId}: ${String(actErr)}`,
              );
            }

            // Continue to send notification
            let title = 'ESCALATION — Yêu cầu xác minh chưa xử lý';
            let messageBody = '';
            if (modeTriggered === 'attempts') {
              title = 'ESCALATION — Không phản hồi sau nhiều lần thông báo';
              messageBody = `Sự kiện ${eventId} chưa được xử lý sau ${notificationAttempts} lần thông báo; đang chuyển tiếp để xử lý.`;
            } else if (modeTriggered === 'timeout') {
              title = 'ESCALATION — Không phản hồi sau thời gian chờ';
              messageBody = `Sự kiện ${eventId} chưa được xử lý sau ${elapsedSec} giây (ngưỡng ${threshold}s); đang chuyển tiếp để xử lý.`;
            } else {
              messageBody = `Sự kiện ${eventId} chưa được xử lý; đang chuyển tiếp để xử lý.`;
            }

            const targetUserId = r.user_id ?? null;
            if (!targetUserId) {
              this.logger.warn(
                `[handleEscalations] No user_id found for event ${eventId}, skipping notification`,
              );
            } else {
              await this._notificationsService.create({
                user_id: targetUserId,
                title,
                message: messageBody,
                data: {
                  event_id: eventId,
                  escalation_count: escalationCount + 1,
                  forward_mode: modeTriggered,
                },
              } as any);
              escalated++;
            }
          } catch (errNoti) {
            this.logger.error(
              `[handleEscalations] Failed to send notification for ${eventId}: ${String(errNoti)}`,
            );
          }
        } catch (err) {
          const msg = `[handleEscalations] Failed to escalate event ${r.event_id}: ${String(err)}`;
          this.logger.error(msg);
          try {
            if (this._prisma) {
              await this._prisma.events.update({
                where: { event_id: r.event_id },
                data: {
                  lifecycle_state: EventLifecycleEnum.EMERGENCY_ESCALATION_FAILED as any,
                  auto_escalation_reason: 'escalation_failed',
                } as any,
              });

              await this._prisma.event_history.create({
                data: {
                  event_id: r.event_id,
                  action: 'escalated' as any,
                  actor_id: null,
                  reason: 'escalation_failed',
                  previous_status: 'PENDING',
                  new_status: 'ESCALATED',
                  metadata: { error: String(err) },
                },
              });
            }
          } catch (dbErr) {
            this.logger.warn(
              `[handleEscalations] Failed to persist escalation-failed state for ${r.event_id}: ${String(dbErr)}`,
            );
          }
        }
      };

      // Process all batches in parallel for better performance
      const batchPromises = batches.map(async (batch) => {
        const batchResults = await Promise.allSettled(
          batch.map((r) => processRow(r, thresholdsSeconds, forwardMode, now, MIN_ATTEMPTS)),
        );

        // Count results from this batch
        batchResults.forEach((result) => {
          if (result.status === 'rejected') {
            this.logger.warn('[handleEscalations] Batch processing error:', result.reason);
          }
        });
      });

      await Promise.all(batchPromises);

      this.logger.log(
        `[handleEscalations] Run summary: processed=${processed}, escalated=${escalated}, skipped=${skipped}`,
      );
    } catch (err) {
      this.logger.error('[handleEscalations] Worker failed', String(err));
    } finally {
      try {
        if (gotLock) await this._prisma.$queryRaw`SELECT pg_advisory_unlock(hashtext(${lockKey}))`;
      } catch (unlockErr) {
        this.logger.warn(
          '[handleEscalations] Failed to release advisory lock: ' + String(unlockErr),
        );
      }
    }
  }
}

export default EventEscalationWorker;
