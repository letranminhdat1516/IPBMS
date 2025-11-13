import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../infrastructure/database/prisma.service';
import { formatIsoLocal } from '../shared/dates/iso-local';

@Injectable()
export class SubscriptionSchedulerWorker {
  private readonly logger = new Logger(SubscriptionSchedulerWorker.name);

  // Cache for plans to reduce database calls
  private plansCache: Map<string, any> = new Map();
  private cacheExpiry: Date | null = null;
  private readonly CACHE_TTL_MINUTES = 10; // Cache plans for 10 minutes

  constructor(private readonly _prisma: PrismaService) {}

  // Get cached plans data
  private async getCachedPlans(): Promise<Map<string, any>> {
    const now = new Date();
    if (this.cacheExpiry && now < this.cacheExpiry && this.plansCache.size > 0) {
      return this.plansCache;
    }

    this.logger.debug('[getCachedPlans] Refreshing plans cache...');
    const plans = await this._prisma.plans.findMany({
      select: { id: true, code: true },
    });

    this.plansCache.clear();
    plans.forEach((plan) => {
      this.plansCache.set(plan.code, plan);
    });

    this.cacheExpiry = new Date(now.getTime() + this.CACHE_TTL_MINUTES * 60 * 1000);
    this.logger.debug(`[getCachedPlans] Cached ${plans.length} plans`);
    return this.plansCache;
  }

  // Run every 5 minutes instead of every minute
  @Cron('*/5 * * * *')
  async handleScheduledDowngrades() {
    this.logger.debug('[handleScheduledDowngrades] Checking for scheduled downgrades...');

    try {
      // Select scheduled downgrade events (limit) by inspecting JSON payload `event_data->>'type'`.
      // Using raw query to avoid Prisma enum validation when database contains non-enum values.
      const candidates = (await this._prisma.$queryRaw`
        SELECT id, subscription_id, event_data
        FROM subscription_events
        WHERE (event_data->>'type') = 'downgrade_scheduled'
        ORDER BY created_at ASC
        LIMIT 200
      `) as Array<any>;

      const now = new Date();
      const rows = (candidates || []).filter((r: any) => {
        try {
          const eff = (r.event_data as any)?.effective_at;
          if (!eff) return false;
          const effDate = new Date(eff);
          return effDate <= now;
        } catch {
          return false;
        }
      });

      if (!rows || rows.length === 0) {
        this.logger.debug('[handleScheduledDowngrades] No scheduled downgrades due');
        return;
      }

      // Get cached plans for validation
      const plansCache = await this.getCachedPlans();

      // Process scheduled downgrades in parallel batches
      const BATCH_SIZE = 10;
      const batches = [];
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        batches.push(rows.slice(i, i + BATCH_SIZE));
      }

      this.logger.log(
        `[handleScheduledDowngrades] Processing ${rows.length} scheduled downgrades in ${batches.length} batches`,
      );

      for (const batch of batches) {
        const batchResults = await Promise.allSettled(
          batch.map((row) => this.processScheduledDowngrade(row, plansCache)),
        );

        // Log results
        batchResults.forEach((result, index) => {
          const row = batch[index];
          if (result.status === 'rejected') {
            this.logger.error(
              `[handleScheduledDowngrades] Failed to process scheduled downgrade id=${row.id}: ${result.reason}`,
            );
          }
        });
      }
    } catch (err) {
      this.logger.error(
        '[handleScheduledDowngrades] Fatal error checking scheduled downgrades',
        String(err),
      );
    }
  }

  // Process a single scheduled downgrade
  private async processScheduledDowngrade(row: any, plansCache: Map<string, any>): Promise<void> {
    const scheduledId = row.id;
    const subscriptionId = row.subscription_id;
    const eventData = row.event_data || {};
    const ed = eventData as any;
    const targetPlan = ed.target_plan || ed.plan_code || ed.plan;

    this.logger.log(
      `[processScheduledDowngrade] Processing scheduled downgrade id=${scheduledId} subscription=${subscriptionId} targetPlan=${targetPlan}`,
    );

    try {
      await this._prisma.$transaction(async (tx: any) => {
        // Acquire advisory lock for this subscription to avoid concurrent modifications
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${subscriptionId}))`;

        // Re-check if this scheduled event was already applied or canceled
        // Check for applied/canceled events referencing this scheduled id by inspecting JSON
        const existedRows = (await tx.$queryRaw`
          SELECT id FROM subscription_events
          WHERE subscription_id = ${subscriptionId}
            AND (event_data->>'scheduled_id') = ${String(scheduledId)}
            AND (event_data->>'type') IN ('downgrade_applied', 'downgrade_canceled')
          LIMIT 1
        `) as Array<any>;
        const existed = existedRows && existedRows.length > 0 ? existedRows[0] : null;

        // If an applied/canceled event exists referencing this scheduled event, skip
        if (existed) {
          this.logger.log(
            `[processScheduledDowngrade] Scheduled id=${scheduledId} already applied/canceled, skipping`,
          );
          return;
        }

        // Re-fetch scheduled event row within transaction to get freshest data
        // Re-fetch scheduled event row within transaction using raw query to avoid enum checks
        const scheduledRows = (await tx.$queryRaw`
          SELECT id, subscription_id, event_data, created_at
          FROM subscription_events
          WHERE id = ${scheduledId}
          LIMIT 1
        `) as Array<any>;
        const scheduled = scheduledRows && scheduledRows.length > 0 ? scheduledRows[0] : null;
        if (!scheduled) {
          this.logger.warn(
            `[processScheduledDowngrade] Scheduled event id=${scheduledId} not found inside transaction`,
          );
          return;
        }

        const effectiveAt = (scheduled.event_data as any)?.effective_at
          ? new Date((scheduled.event_data as any).effective_at)
          : null;

        if (effectiveAt && effectiveAt > new Date()) {
          // Not due yet — format timestamp as ISO-like local time with offset to match logger prefix
          const localRep = formatIsoLocal(effectiveAt);
          this.logger.debug(
            `[processScheduledDowngrade] Scheduled id=${scheduledId} not due yet (effectiveAt=${localRep} local)`,
          );
          return;
        }

        // Fetch subscription
        const sub = await tx.subscriptions.findUnique({
          where: { subscription_id: subscriptionId } as any,
        } as any);
        if (!sub) {
          this.logger.warn(
            `[processScheduledDowngrade] Subscription ${subscriptionId} not found, marking scheduled as failed`,
          );
          await tx.subscription_histories.create({
            data: {
              subscription_id: subscriptionId,
              event_type: 'downgrade_failed',
              event_data: {
                scheduled_id: scheduledId,
                reason: 'subscription_not_found',
              },
            },
          } as any);
          return;
        }

        // Validate plan exists using cache
        let planRecord = null as any;
        if (targetPlan) {
          planRecord = plansCache.get(String(targetPlan));
        }

        if (!planRecord) {
          this.logger.warn(
            `[processScheduledDowngrade] Target plan ${targetPlan} not found for scheduled id=${scheduledId}`,
          );
          await tx.subscription_histories.create({
            data: {
              subscription_id: subscriptionId,
              event_type: 'downgrade_failed',
              event_data: {
                scheduled_id: scheduledId,
                reason: 'plan_not_found',
                target_plan: targetPlan,
              },
            },
          } as any);
          return;
        }

        // Apply downgrade: update subscription plan_code and plan_id
        await tx.subscriptions.update({
          where: { subscription_id: subscriptionId } as any,
          data: {
            plan_code: planRecord.code,
            plan_id: planRecord.id,
            // keep status, current_period_end as-is
          } as any,
        } as any);

        // Record applied event
        await tx.subscription_histories.create({
          data: {
            subscription_id: subscriptionId,
            event_type: 'downgrade_applied',
            event_data: {
              scheduled_id: scheduledId,
              applied_at: new Date().toISOString(),
              target_plan: planRecord.code,
            },
          },
        } as any);

        this.logger.log(
          `[processScheduledDowngrade] Applied scheduled downgrade id=${scheduledId} subscription=${subscriptionId} -> ${planRecord.code}`,
        );
      });
    } catch (err) {
      this.logger.error(
        `[processScheduledDowngrade] Error applying scheduled id=${scheduledId} subscription=${subscriptionId}: ${(err as Error).message}`,
        (err as Error).stack,
      );
      // attempt to write a failure event outside transaction (best-effort)
      try {
        await this._prisma.subscription_histories.create({
          data: {
            subscription_id: subscriptionId,
            event_type: 'downgrade_failed',
            event_data: { scheduled_id: scheduledId, reason: (err as Error).message } as any,
          } as any,
        } as any);
      } catch (e) {
        this.logger.error(
          '[processScheduledDowngrade] Failed to record downgrade_failed event',
          String(e),
        );
      }
    }
  }
}

export default SubscriptionSchedulerWorker;
