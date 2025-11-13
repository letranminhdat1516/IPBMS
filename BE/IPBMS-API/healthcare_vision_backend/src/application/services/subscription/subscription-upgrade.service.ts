import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { toMinor, toMajor, roundMajor } from '../../../shared/utils/money.util';
import {
  prorateMinor,
  getPriceForPeriod,
  calculateProrationGivenPrices,
  BillingPeriod,
} from '../../../shared/utils/proration.util';
import { PlanRepository } from '../../../infrastructure/repositories/admin/plan.repository';
import { SubscriptionEventRepository } from '../../../infrastructure/repositories/payments/subscription-event.repository';
import { SubscriptionRepository } from '../../../infrastructure/repositories/payments/subscription.repository';
import { TransactionRepository } from '../../../infrastructure/repositories/payments/transaction.repository';

export interface UpgradePreparationDto {
  userId: string;
  subscriptionId: string;
  plan_code: string;
  paymentProvider: string;
  idempotencyKey?: string;
}

export interface UpgradeResult {
  status: 'success' | 'requires_action' | 'failed';
  prorationCharge: string;
  prorationCredit: string;
  amountDue: string;
  transactionId?: string;
  periodStart?: Date;
  periodEnd?: Date;
  reason?: string;
}

@Injectable()
export class SubscriptionUpgradeService {
  private readonly logger = new Logger(SubscriptionUpgradeService.name);

  constructor(
    private readonly _prismaService: PrismaService,
    private readonly _subscriptionRepository: SubscriptionRepository,
    private readonly _transactionRepository: TransactionRepository,
    private readonly _planRepository: PlanRepository,
    private readonly _subscriptionEventRepository: SubscriptionEventRepository,
  ) {}

  /**
   * Prepare upgrade with proration calculation and transaction creation
   */
  async prepareUpgrade(dto: UpgradePreparationDto): Promise<UpgradeResult> {
    this.logger.log(
      `[prepareUpgrade] Bắt đầu chuẩn bị upgrade cho user ${dto.userId}, subscription ${dto.subscriptionId} lên plan ${dto.plan_code}`,
    );

    return this._prismaService.$transaction(async (_prisma) => {
      // Idempotency check
      if (dto.idempotencyKey) {
        const existed = await _prisma.transactions.findFirst({
          where: {
            subscription_id: dto.subscriptionId,
            idempotency_key: dto.idempotencyKey,
            effective_action: 'upgrade',
          },
        });
        if (existed) {
          this.logger.log(
            `[prepareUpgrade] Idempotency hit: transaction đã tồn tại ${existed.tx_id}, status: ${existed.status}`,
          );
          return {
            status: String(existed.status) === 'paid' ? 'success' : 'requires_action',
            prorationCharge: String(existed.proration_charge || 0),
            prorationCredit: String(existed.proration_credit || 0),
            amountDue: String(existed.amount_total || 0),
            transactionId: existed.tx_id,
            periodStart: existed.period_start || undefined,
            periodEnd: existed.period_end || undefined,
          };
        }
      }

      // Find current subscription
      const current = await _prisma.subscriptions.findFirst({
        where: {
          subscription_id: dto.subscriptionId,
          user_id: dto.userId,
          status: { in: ['trialing', 'active', 'past_due', 'paused'] },
        },
        include: {
          plans: true,
        },
      });

      if (!current) {
        this.logger.error(
          `[prepareUpgrade] Không tìm thấy subscription active cho user ${dto.userId}`,
        );
        return {
          status: 'failed',
          prorationCharge: '0',
          prorationCredit: '0',
          amountDue: '0',
          reason: 'subscription_not_found',
        };
      }

      // Find new plan
      const planNew = await _prisma.plans.findFirst({
        where: {
          code: dto.plan_code,
          is_current: true,
        },
      });

      if (!planNew) {
        this.logger.error(`[prepareUpgrade] Plan ${dto.plan_code} không tồn tại`);
        return {
          status: 'failed',
          prorationCharge: '0',
          prorationCredit: '0',
          amountDue: '0',
          reason: 'plan_not_found',
        };
      }

      // Business rule validation
      if (current.plan_code === dto.plan_code) {
        this.logger.warn(
          `[prepareUpgrade] User ${dto.userId} đang cố upgrade lên cùng plan ${dto.plan_code}`,
        );
        return {
          status: 'failed',
          prorationCharge: '0',
          prorationCredit: '0',
          amountDue: '0',
          reason: 'same_plan_upgrade',
        };
      }

      if (current.status === 'canceled') {
        this.logger.warn(
          `[prepareUpgrade] Không thể upgrade subscription đã bị cancel: ${dto.subscriptionId}`,
        );
        return {
          status: 'failed',
          prorationCharge: '0',
          prorationCredit: '0',
          amountDue: '0',
          reason: 'subscription_canceled',
        };
      }

      // Calculate proration (returns major VND integer)
      const prorationResult = this.calculateProration(current, planNew);

      // Create transaction
      const txnObj = await _prisma.transactions.create({
        data: {
          subscription_id: dto.subscriptionId,
          plan_code: dto.plan_code,
          plan_snapshot: {},
          amount_subtotal: toMinor(prorationResult.amountDue),
          amount_total: toMinor(prorationResult.amountDue),
          currency: 'VND',
          period_start: current.current_period_start,
          period_end: current.current_period_end || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default to 30 days from now if null
          status: prorationResult.amountDue > 0 ? ('open' as any) : ('paid' as any),
          effective_action: 'upgrade',
          provider: dto.paymentProvider === 'vn_pay' ? 'vn_pay' : 'manual',
          idempotency_key: dto.idempotencyKey,
          is_proration: true,
          proration_charge: toMinor(prorationResult.prorationCharge),
          proration_credit: toMinor(prorationResult.prorationCredit),
          plan_snapshot_old: current.plans ? this.convertBigIntToString(current.plans) : null,
          plan_snapshot_new: planNew ? this.convertBigIntToString(planNew) : null,
        },
      });

      this.logger.log(
        `[prepareUpgrade] Đã tạo transaction ${txnObj.tx_id}, amount due: ${prorationResult.amountDue}`,
      );

      // Apply free upgrade immediately
      if (prorationResult.amountDue === 0) {
        await this.applyFreeUpgrade(_prisma, txnObj.tx_id, current, planNew);
        return {
          status: 'success',
          prorationCharge: String(prorationResult.prorationCharge),
          prorationCredit: String(prorationResult.prorationCredit),
          // return amount in major VND to client
          amountDue: String(prorationResult.amountDue),
          transactionId: txnObj.tx_id,
          periodStart: current.current_period_start || undefined,
          periodEnd: current.current_period_end || undefined,
        };
      }

      return {
        status: 'requires_action',
        prorationCharge: String(prorationResult.prorationCharge),
        prorationCredit: String(prorationResult.prorationCredit),
        // amountDue returned as major VND
        amountDue: String(prorationResult.amountDue),
        transactionId: txnObj.tx_id,
        periodStart: current.current_period_start || undefined,
        periodEnd: current.current_period_end || undefined,
      };
    });
  }

  /**
   * Apply upgrade after successful payment
   */
  async applyUpgradeOnPaymentSuccess(txId: string): Promise<{ ok: boolean; reason?: string }> {
    this.logger.log(
      `[applyUpgradeOnPaymentSuccess] Bắt đầu áp dụng upgrade cho transaction ${txId}`,
    );

    return this._prismaService.$transaction(async (prisma) => {
      // Find transaction with related data
      const tx = await this._transactionRepository.findByTxId(txId, {
        subscriptions: {
          include: {
            plans: true,
            users: true,
          },
        },
        payment: true,
      } as any);

      if (!tx) {
        this.logger.warn(`[applyUpgradeOnPaymentSuccess] Transaction ${txId} không tìm thấy`);
        return { ok: false, reason: 'tx_not_found' };
      }

      if (String(tx.status) === 'paid') {
        this.logger.log(
          `[applyUpgradeOnPaymentSuccess] Transaction ${txId} đã được xử lý thành công trước đó`,
        );
        return { ok: true, reason: 'already_succeeded' };
      }

      // Validate payment
      const paymentRecord = (tx as any).payment;
      const isPaymentSettled =
        paymentRecord &&
        (paymentRecord.status === 'paid' || paymentRecord.status_enum === 'completed');

      if (!(tx as any).provider_payment_id || !isPaymentSettled) {
        this.logger.warn(
          `[applyUpgradeOnPaymentSuccess] Payment ${(tx as any).provider_payment_id} chưa được thanh toán`,
        );
        return { ok: false, reason: 'payment_not_paid' };
      }

      // Acquire advisory lock inside the current transaction (use the transaction client `prisma`)
      await prisma.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${tx.subscription_id}))`;

      const sub = (tx as any).subscriptions;
      if (!sub) {
        this.logger.error(`[applyUpgradeOnPaymentSuccess] Subscription không tìm thấy`);
        return { ok: false, reason: 'subscription_not_found' };
      }

      // Idempotency check via events (scalar-first)
      const existedEvent = await this._subscriptionEventRepository.findByTxId(
        sub.subscription_id,
        'upgraded',
        tx.tx_id,
      );

      if (existedEvent) {
        await (prisma as any).transactions.update({
          where: { tx_id: tx.tx_id },
          data: { status: 'paid' as any },
        });
        return { ok: true, reason: 'already_applied' };
      }

      // Get new plan
      const planCode = ((tx as any).plan_snapshot_new as any)?.code || tx.plan_code;
      const planNew = await this._planRepository.findByCode(planCode);
      if (!planNew) {
        this.logger.error(`[applyUpgradeOnPaymentSuccess] Plan mới không tìm thấy: ${planCode}`);
        return { ok: false, reason: 'plan_new_not_found' };
      }

      // Apply upgrade
      const now = new Date();
      await (prisma as any).subscriptions.update({
        where: { subscription_id: tx.subscription_id },
        data: {
          plan_code: planNew.code,
          plan_id: planNew.id,
          status: 'active',
          last_payment_at: now,
        },
      });

      // Update entitlements
      await this.updateEntitlementsForUpgrade(prisma, sub, planNew, now);

      // Mark transaction as succeeded and log event
      await (prisma as any).transactions.update({
        where: { tx_id: tx.tx_id },
        data: { status: 'paid' as any },
      });

      // Use repository helper to create upgraded event idempotently inside transaction
      await this._subscriptionEventRepository.createIfNotExistsByEventDataInTransaction(
        prisma as any,
        sub.subscription_id,
        'upgraded',
        'transactionId',
        tx.tx_id,
        {
          subscription_id: sub.subscription_id,
          event_type: 'upgraded',
          event_data: {
            transactionId: tx.tx_id,
            plan: planNew.code,
            prorationCharge: tx.proration_charge != null ? String(tx.proration_charge) : null,
            prorationCredit: tx.proration_credit != null ? String(tx.proration_credit) : null,
            amountDue: tx.amount_total != null ? String(tx.amount_total) : null,
          },
          tx_id: tx.tx_id,
          created_at: now,
        } as any,
      );

      this.logger.log(
        `[applyUpgradeOnPaymentSuccess] Upgrade hoàn thành thành công cho transaction ${txId}`,
      );
      return { ok: true };
    });
  }

  /**
   * Calculate proration for upgrade
   */
  private calculateProration(current: any, newPlan: any) {
    // Resolve billing period from subscription current record if available
    const billingPeriod: BillingPeriod = (current.billing_period as BillingPeriod) || 'monthly';

    // Normalize prices to the subscription billing period before comparison
    const oldPrice = getPriceForPeriod(current.plans ?? {}, billingPeriod);
    const newPrice = getPriceForPeriod(newPlan ?? {}, billingPeriod);

    if (newPrice < oldPrice) {
      throw new Error('Use prepareDowngrade for price reduction');
    }

    const oldStart = current.current_period_start;
    const oldEnd = current.current_period_end;

    // Use BigInt-based proration util to avoid float rounding issues.
    try {
      const now = new Date();
      if (!oldStart || !oldEnd || oldEnd <= now) {
        return { prorationCharge: 0, prorationCredit: 0, amountDue: 0 };
      }

      // Convert major VND to minor units (BigInt)
      const oldMinor = toMinor(oldPrice);
      const newMinor = toMinor(newPrice);

      const totalPeriodMs = BigInt(oldEnd.getTime() - oldStart.getTime());
      const remainingMs = BigInt(Math.max(0, oldEnd.getTime() - now.getTime()));

      if (totalPeriodMs <= 0n) {
        return { prorationCharge: 0, prorationCredit: 0, amountDue: 0 };
      }

      const proratedMinor = prorateMinor(oldMinor, newMinor, remainingMs, totalPeriodMs);
      const prorationChargeMajor = roundMajor(toMajor(proratedMinor));
      // For upgrade, prorationCredit is zero (no refund)
      const prorationCreditMajor = 0;
      const amountDueMajor = prorationChargeMajor;

      return {
        prorationCharge: prorationChargeMajor,
        prorationCredit: prorationCreditMajor,
        amountDue: amountDueMajor,
      };
    } catch (err) {
      this.logger.error(`[calculateProration] BigInt proration failed: ${String(err)}`);
      // Fallback to previous number-based calulation to be safe
      const pr = calculateProrationGivenPrices(oldPrice, newPrice, oldStart, oldEnd);
      return pr;
    }
  }

  /**
   * Apply free upgrade immediately
   */
  private async applyFreeUpgrade(prisma: any, txId: string, subscription: any, newPlan: any) {
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

    await this.updateEntitlementsForUpgrade(prisma, subscription, newPlan, now);

    await prisma.subscription_histories.create({
      data: {
        subscription_id: subscription.subscription_id,
        event_type: 'upgraded',
        event_data: {
          transactionId: txId,
          plan: newPlan.code,
          prorationCharge: 0,
          prorationCredit: 0,
          amountDue: 0,
        },
        tx_id: txId,
        transaction: { connect: { tx_id: txId } },
      },
    });

    // Ensure idempotent creation
    await this._subscriptionEventRepository.createIfNotExistsByEventDataInTransaction(
      prisma as any,
      subscription.subscription_id,
      'upgraded',
      'transactionId',
      txId,
      {
        subscription_id: subscription.subscription_id,
        event_type: 'upgraded',
        event_data: {
          transactionId: txId,
          plan: newPlan.code,
          prorationCharge: 0,
          prorationCredit: 0,
          amountDue: 0,
        },
        transaction: { connect: { tx_id: txId } } as any,
      } as any,
    );

    this.logger.log(`[applyFreeUpgrade] Upgrade miễn phí hoàn thành thành công`);
  }

  /**
   * Update entitlements for upgrade - now using subscription_histories for tracking
   */
  private async updateEntitlementsForUpgrade(
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

    // Create history record for entitlement changes
    await prisma.subscription_histories.create({
      data: {
        subscription_id: subscription.subscription_id,
        event_type: 'upgraded',
        event_data: {
          action: 'upgrade',
          from_plan: subscription.plan_code,
          to_plan: newPlan.code,
          entitlement_changes: entitlementChanges,
          effective_at: now,
        },
        created_at: now,
      },
    });

    this.logger.debug(
      `[updateEntitlementsForUpgrade] Đã log entitlement changes cho subscription ${subscription.subscription_id}`,
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
