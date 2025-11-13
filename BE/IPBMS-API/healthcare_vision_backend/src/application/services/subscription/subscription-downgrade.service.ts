import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { prorateMinor } from '../../../shared/utils/proration.util';
import { PlanRepository } from '../../../infrastructure/repositories/admin/plan.repository';
import { SubscriptionEventRepository } from '../../../infrastructure/repositories/payments/subscription-event.repository';
import { SubscriptionRepository } from '../../../infrastructure/repositories/payments/subscription.repository';
import { TransactionRepository } from '../../../infrastructure/repositories/payments/transaction.repository';

export interface DowngradePreparationDto {
  userId: string;
  subscriptionId: string;
  plan_code: string;
  paymentProvider: string;
  idempotencyKey?: string;
}

export interface DowngradeResult {
  status: 'success' | 'requires_action' | 'failed';
  prorationRefund: string;
  amountRefunded: string;
  transactionId?: string;
  periodStart?: Date;
  periodEnd?: Date | null;
  reason?: string;
}

@Injectable()
export class SubscriptionDowngradeService {
  private readonly logger = new Logger(SubscriptionDowngradeService.name);

  constructor(
    private readonly _prismaService: PrismaService,
    private readonly _subscriptionRepository: SubscriptionRepository,
    private readonly _transactionRepository: TransactionRepository,
    private readonly _planRepository: PlanRepository,
    private readonly _subscriptionEventRepository: SubscriptionEventRepository,
  ) {}

  /**
   * Prepare downgrade with proration calculation and transaction creation
   * CHÍNH SÁCH: Không cho downgrade giữa kỳ có refund
   */
  async prepareDowngrade(dto: DowngradePreparationDto): Promise<DowngradeResult> {
    this.logger.log(
      `[prepareDowngrade] CHÍNH SÁCH: Không cho downgrade giữa kỳ có refund. User ${dto.userId} chỉ có thể hủy cuối kỳ về Basic.`,
    );

    // CHÍNH SÁCH: Không cho downgrade giữa kỳ
    return {
      status: 'failed',
      prorationRefund: '0',
      amountRefunded: '0',
      reason: 'downgrade_only_at_period_end',
    };
  }
  async applyDowngradeOnPaymentSuccess(
    subscriptionId: string,
    newPlanCode: string,
    transactionId: string,
  ): Promise<DowngradeResult> {
    this.logger.log(
      `[applyDowngradeOnPaymentSuccess] Áp dụng downgrade cho subscription ${subscriptionId}`,
    );

    const now = new Date();

    return this._prismaService.$transaction(async (_prisma) => {
      try {
        // Get subscription with lock
        const subscription = await _prisma.subscriptions.findFirst({
          where: {
            subscription_id: subscriptionId,
            status: { in: ['trialing', 'active', 'past_due', 'paused'] },
          },
          include: {
            plans: true,
          },
        });

        if (!subscription) {
          throw new Error('Subscription not found');
        }

        // Get new plan
        const newPlan = await _prisma.plans.findFirst({
          where: {
            code: newPlanCode,
          },
        });

        if (!newPlan) {
          throw new Error('Plan not found');
        }

        // Calculate proration
        const prorationAmount = this.calculateProration(
          subscription,
          subscription.plans!.price,
          newPlan.price,
        );

        // Idempotency pre-check: if event already applied, mark transaction paid and return
        let existedEvent: any = null;
        if (typeof (this._subscriptionEventRepository as any).findByTxId === 'function') {
          existedEvent = await (this._subscriptionEventRepository as any).findByTxId(
            subscriptionId,
            'downgraded' as any,
            transactionId,
          );
        } else if (
          typeof (this._subscriptionEventRepository as any).findByEventDataPath === 'function'
        ) {
          // Fallback for older mocks/implementations: look up by JSON path
          try {
            existedEvent = await (this._subscriptionEventRepository as any).findByEventDataPath(
              subscriptionId,
              'downgraded' as any,
              'transactionId',
              transactionId,
            );
          } catch {
            existedEvent = null;
          }
        }
        if (existedEvent) {
          await _prisma.transactions.update({
            where: { tx_id: transactionId },
            data: { status: 'paid' as any },
          });
          return {
            status: 'success',
            prorationRefund: String(prorationAmount),
            amountRefunded: String(prorationAmount),
            transactionId,
            periodStart: subscription.current_period_start,
            periodEnd: subscription.current_period_end || undefined,
          };
        }

        // Update subscription
        const updatedSubscription = await _prisma.subscriptions.update({
          where: { subscription_id: subscriptionId },
          data: {
            plan_code: newPlanCode,
            plan_id: newPlan.id, // ✅ thêm plan_id
          },
        });

        // Update transaction status
        await _prisma.transactions.update({
          where: { tx_id: transactionId },
          data: { status: 'paid' as any },
        });

        // Update entitlements using subscription_histories
        await this.updateEntitlementsForDowngrade(_prisma, subscription, newPlan, now);

        // Log subscription event (idempotent)
        await this._subscriptionEventRepository.createIfNotExistsByEventDataInTransaction(
          _prisma as any,
          subscriptionId,
          'downgraded',
          'transactionId',
          transactionId,
          {
            subscription_id: subscriptionId,
            event_type: 'downgraded',
            event_data: {
              transactionId,
              oldPlan: subscription.plans!.code,
              newPlan: newPlan.code,
              prorationAmount: String(prorationAmount),
              effectiveDate: now.toISOString(),
            },
          } as any,
        );

        this.logger.log(
          `[applyDowngradeOnPaymentSuccess] Hoàn thành áp dụng downgrade cho subscription ${subscriptionId}`,
        );

        return {
          status: 'success',
          prorationRefund: prorationAmount.toString(),
          amountRefunded: prorationAmount.toString(),
          transactionId,
          periodStart: updatedSubscription.current_period_start,
          periodEnd: updatedSubscription.current_period_end || undefined,
        };
      } catch (error) {
        this.logger.error(
          `[applyDowngradeOnPaymentSuccess] Lỗi áp dụng downgrade: ${(error as Error).message}`,
          (error as Error).stack,
        );

        // Update transaction status to failed
        try {
          await _prisma.transactions.update({
            where: { tx_id: transactionId },
            data: { status: 'void' as any },
          });
        } catch (updateError) {
          this.logger.error(
            `[applyDowngradeOnPaymentSuccess] Lỗi cập nhật transaction status: ${(updateError as Error).message}`,
          );
        }

        return {
          status: 'failed',
          prorationRefund: '0',
          amountRefunded: '0',
          reason: (error as Error).message,
        };
      }
    });
  }

  /**
   * Calculate proration amount for downgrade
   */
  private calculateProration(subscription: any, currentPrice: bigint, newPrice: bigint): bigint {
    try {
      const now = new Date();
      const periodEnd = subscription.current_period_end
        ? new Date(subscription.current_period_end)
        : null;

      if (!periodEnd || periodEnd <= now) {
        // No proration needed if period has ended or no end date
        return 0n;
      }

      // Calculate remaining time in current billing period using integer ms
      const diffMs = periodEnd.getTime() - subscription.current_period_start.getTime();
      const totalPeriodMs = BigInt(diffMs);
      const remainingMs = BigInt(Math.max(0, periodEnd.getTime() - now.getTime()));

      if (totalPeriodMs <= 0n) return 0n;

      try {
        const proration = prorateMinor(currentPrice, newPrice, remainingMs, totalPeriodMs);
        this.logger.log(
          `[calculateProration] Proration calculated (bigint): ${proration} (remainingMs=${String(
            remainingMs,
          )}, totalMs=${String(totalPeriodMs)})`,
        );
        return proration;
      } catch (innerErr) {
        this.logger.error(`[calculateProration] BigInt proration failed: ${String(innerErr)}`);
        return 0n;
      }
    } catch (error) {
      this.logger.error(
        `[calculateProration] Error calculating proration: ${(error as Error).message}`,
      );
      return 0n;
    }
  }

  /**
   * Apply free downgrade immediately
   */
  private async applyFreeDowngrade(prisma: any, txId: string, subscription: any, newPlan: any) {
    const now = new Date();

    await prisma.subscriptions.update({
      where: { subscription_id: subscription.subscription_id },
      data: {
        plan_code: newPlan.code,
        plan_id: newPlan.id,
        status: 'active',
        last_payment_at: now,
      },
    });

    await this.updateEntitlementsForDowngrade(prisma, subscription, newPlan, now);
    const idempotencyKey = `downgrade:${subscription.subscription_id}:${txId}`;
    await this._subscriptionEventRepository.createIfNotExistsByEventDataInTransaction(
      prisma as any,
      subscription.subscription_id,
      'downgraded' as any,
      'idempotency_key',
      idempotencyKey,
      {
        subscription_id: subscription.subscription_id,
        event_type: 'downgraded',
        event_data: {
          transactionId: txId,
          plan: newPlan.code,
          prorationCharge: 0,
          prorationCredit: 0,
          amountDue: 0,
          idempotency_key: idempotencyKey,
        },
        tx_id: txId,
      } as any,
    );

    this.logger.log(`[applyFreeDowngrade] Downgrade miễn phí hoàn thành thành công`);
  }

  /**
   * Update entitlements for downgrade - now using subscription_histories for tracking
   */
  private async updateEntitlementsForDowngrade(
    prisma: any,
    subscription: any,
    newPlan: any,
    now: Date,
  ) {
    // Log entitlement changes to subscription_histories instead of creating entitlement records
    const oldPlan = subscription.plans;
    const entitlementChanges = {
      cameras: { from: oldPlan?.camera_quota || 0, to: newPlan.camera_quota },
      caregivers: { from: oldPlan?.caregiver_seats || 0, to: newPlan.caregiver_seats },
      sites: { from: oldPlan?.sites || 0, to: newPlan.sites },
      retentionDays: { from: oldPlan?.retention_days || 0, to: newPlan.retention_days },
      storageGB: {
        from: Number((oldPlan?.storage_size || '').match(/\d+/)?.[0] || 0),
        to: Number((newPlan.storage_size || '').match(/\d+/)?.[0] || 0),
      },
    };

    // Create history record for entitlement changes (idempotent)
    const entIdempotency = `entitlements:${subscription.subscription_id}:${now.toISOString()}`;
    await this._subscriptionEventRepository.createIfNotExistsByEventDataInTransaction(
      prisma as any,
      subscription.subscription_id,
      'entitlements_updated' as any,
      'idempotency_key',
      entIdempotency,
      {
        subscription_id: subscription.subscription_id,
        event_type: 'entitlements_updated',
        event_data: {
          action: 'downgrade',
          from_plan: subscription.plan_code,
          to_plan: newPlan.code,
          entitlement_changes: entitlementChanges,
          effective_at: now,
          idempotency_key: entIdempotency,
        },
        created_at: now,
      } as any,
    );

    this.logger.debug(
      `[updateEntitlementsForDowngrade] Đã log entitlement changes cho subscription ${subscription.subscription_id}`,
    );
  }

  /**
   * Convert BigInt fields to strings for JSON serialization
   */
  private convertBigIntToString(obj: any): any {
    if (!obj) return null;
    const clone: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      const value = obj[key];
      clone[key] = typeof value === 'bigint' ? value.toString() : value;
    }
    return clone;
  }
}
