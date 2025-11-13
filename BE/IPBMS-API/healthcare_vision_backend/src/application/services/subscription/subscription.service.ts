import { Injectable, Logger, Optional } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { PaginateOptions } from '../../../core/types/paginate.types';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PlanRepository } from '../../../infrastructure/repositories/admin/plan.repository';
import { PaymentRepository } from '../../../infrastructure/repositories/payments/payment.repository';
import { SubscriptionEventRepository } from '../../../infrastructure/repositories/payments/subscription-event.repository';
import { SubscriptionRepository } from '../../../infrastructure/repositories/payments/subscription.repository';
import { TransactionRepository } from '../../../infrastructure/repositories/payments/transaction.repository';
import { NotificationService } from '../../../shared/services/notification.service';
import { SubscriptionDowngradeService } from '../../services/subscription/subscription-downgrade.service';
import { SubscriptionUpgradeService } from '../../services/subscription/subscription-upgrade.service';
import { SubscriptionEventsService } from './subscription-events.service';
import { PaymentService } from '../payments/payment.service';
import { CreatePaymentDto } from '../../dto/payment/payment.dto';
import { SubscriptionMetricsService } from '../subscription/subscription-metrics.service';
import { safeEmitAsync } from '../../../shared/utils/safe-emit.util';
import PlanBillingType from '../../../core/types/plan-billing.types';
import { getPriceForPeriod } from '../../../shared/utils/proration.util';

type BillingPeriod = 'monthly' | 'none';
const VALID_BILLING_PERIODS: BillingPeriod[] = ['monthly', 'none'];
const VALID_BILLING_TYPES: PlanBillingType[] = [PlanBillingType.PREPAID, PlanBillingType.POSTPAID];

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    private readonly _prismaService: PrismaService,
    private readonly _subscriptionRepository: SubscriptionRepository,
    private readonly _transactionRepository: TransactionRepository,
    private readonly _paymentRepository: PaymentRepository,
    private readonly _planRepository: PlanRepository,
    private readonly _subscriptionEventRepository: SubscriptionEventRepository,
    private readonly _subscriptionUpgradeService: SubscriptionUpgradeService,
    private readonly _subscriptionDowngradeService: SubscriptionDowngradeService,
    private readonly _notificationService: NotificationService,
    private readonly _subscriptionEventsService?: SubscriptionEventsService,
    private readonly _paymentService?: PaymentService,
    @Optional() private readonly _eventEmitter?: EventEmitter2,
    @Optional() private readonly _subscriptionMetrics?: SubscriptionMetricsService,
  ) {}

  private extractPlanCodeFromPayment(payment: any): string {
    if (!payment) return '';
    if (payment.plan_code) return String(payment.plan_code).toLowerCase();
    try {
      return String((payment.delivery_data as any)?.plan_code || '').toLowerCase();
    } catch {
      return '';
    }
  }

  /**
   * Convert BigInt values to strings to avoid JSON serialization errors
   * @param obj - Object to convert
   * @returns Object with BigInt fields converted to strings
   */
  private convertBigIntToString(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'bigint') return obj.toString();
    if (obj instanceof Date) return obj;
    if (Array.isArray(obj)) return obj.map((item) => this.convertBigIntToString(item));
    if (typeof obj === 'object') {
      const converted = { ...obj };
      for (const key in converted) {
        if (!Object.prototype.hasOwnProperty.call(converted, key)) continue;
        converted[key] = this.convertBigIntToString(converted[key]);
      }
      return converted;
    }
    return obj;
  }

  private resolveBillingPeriod(
    subscription: any,
    plan: any,
    requested?: BillingPeriod,
  ): BillingPeriod {
    let candidate: BillingPeriod | undefined = requested;

    if (!candidate || candidate === 'none') {
      const subPeriod = subscription?.billing_period as BillingPeriod | undefined;
      if (subPeriod && subPeriod !== 'none') candidate = subPeriod;
    }

    if (!candidate || candidate === 'none') {
      const planPeriod = plan?.billing_period as BillingPeriod | undefined;
      if (planPeriod && planPeriod !== 'none') candidate = planPeriod;
    }

    return candidate && VALID_BILLING_PERIODS.includes(candidate) ? candidate : 'monthly';
  }

  private addBillingPeriod(base: Date, billingPeriod: BillingPeriod): Date {
    // Delegate to shared billing util which uses dayjs.tz('Asia/Ho_Chi_Minh')
    try {
      // import lazily to avoid circular deps during DI

      const { addBillingPeriod: addBp } = require('../../../shared/dates/billing.util');
      return addBp(base, billingPeriod);
    } catch {
      // Fallback to original implementation if util not available
      const next = new Date(base.getTime());
      switch (billingPeriod) {
        case 'monthly':
          next.setMonth(next.getMonth() + 1);
          break;
        case 'none':
        default:
          break;
      }
      return next;
    }
  }

  private calculateBillingAmount(plan: any, billingPeriod: BillingPeriod): number {
    return getPriceForPeriod(plan, billingPeriod);
  }

  private normalizeBillingType(value: unknown): PlanBillingType | null {
    if (!value) return null;
    if (Object.values(PlanBillingType).includes(value as PlanBillingType)) {
      return value as PlanBillingType;
    }
    if (typeof value === 'string') {
      const lower = value.toLowerCase();
      if (lower === PlanBillingType.PREPAID) return PlanBillingType.PREPAID;
      if (lower === PlanBillingType.POSTPAID) return PlanBillingType.POSTPAID;
    }
    return null;
  }

  private resolveBillingType(
    plan: any,
    requested?: PlanBillingType | string | null,
  ): PlanBillingType {
    const requestedNormalized = this.normalizeBillingType(requested ?? null);
    if (requestedNormalized && VALID_BILLING_TYPES.includes(requestedNormalized)) {
      return requestedNormalized;
    }

    const planType = this.normalizeBillingType((plan as any)?.billing_type);
    if (planType && VALID_BILLING_TYPES.includes(planType)) {
      return planType;
    }

    return PlanBillingType.PREPAID;
  }

  private async ensureSubscriptionDefaults(subscription: any, planRecord?: any): Promise<any> {
    let plan = planRecord;

    if (!plan && subscription?.plan_code) {
      try {
        plan = await this.findCurrentPlanByCode(String(subscription.plan_code));
      } catch (err) {
        this.logger.warn(
          `[ensureSubscriptionDefaults] Failed to load plan for subscription ${subscription?.subscription_id}: ${String(
            err instanceof Error ? err.message : err,
          )}`,
        );
      }
    }

    const updateData: Record<string, any> = {};

    if (!subscription.plan_id && plan?.id) {
      updateData.plan_id = plan.id;
      subscription.plan_id = plan.id;
    }

    // Derive billing period when missing or explicitly 'none'.
    // Previously this only derived when auto_renew===true or current_period_end present.
    // Change: always derive default billing period (fallback to 'monthly' in resolveBillingPeriod)
    // when the subscription has no billing_period or is 'none'. This keeps default duration
    // to 1 month without requiring a DB migration.
    const shouldDeriveBillingPeriod =
      !subscription.billing_period || subscription.billing_period === 'none';

    if (shouldDeriveBillingPeriod) {
      const resolvedPeriod = this.resolveBillingPeriod(
        subscription,
        plan,
        subscription.billing_period as BillingPeriod | undefined,
      );
      if (resolvedPeriod && resolvedPeriod !== subscription.billing_period) {
        updateData.billing_period = resolvedPeriod;
        subscription.billing_period = resolvedPeriod;
      }
    }

    if (Object.keys(updateData).length) {
      try {
        await this._prismaService.subscriptions.update({
          where: { subscription_id: subscription.subscription_id },
          data: updateData,
        });
      } catch (err) {
        this.logger.warn(
          `[ensureSubscriptionDefaults] Failed to persist defaults for subscription ${subscription.subscription_id}: ${String(
            err instanceof Error ? err.message : err,
          )}`,
        );
      }
    }

    return plan;
  }

  private isPaymentPaid(payment: any): boolean {
    if (!payment) return false;
    if (payment.status_enum && payment.status_enum === 'completed') return true;
    return String(payment.status || '').toLowerCase() === 'paid';
  }

  /**
   * Find current active plan by code
   */
  private async findCurrentPlanByCode(planCode: string): Promise<any> {
    return await this._prismaService.plans.findFirst({
      where: {
        code: planCode.toLowerCase(),
        is_current: true,
      },
    });
  }

  /**
   * Get plan selection object for optimized queries
   */
  private getPlanSelectFields() {
    return {
      id: true,
      code: true,
      name: true,
      price: true,
      currency: true,
      billing_period: true,
      camera_quota: true,
      storage_size: true,
      caregiver_seats: true,
      sites: true,
      description: true,
      is_active: true,
      is_current: true,
      retention_days: true,
      major_updates_months: true,
      version: true,
      effective_from: true,
      effective_to: true,
      is_recommended: true,
      successor_plan_code: true,
      successor_plan_version: true,
      tier: true,
      status: true,
      created_at: true,
      updated_at: true,
    };
  }

  private stripAutoExpiredNote(notes?: string | null): string | null {
    if (!notes) return notes ?? null;
    const filtered = notes
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('auto_expired:'));
    if (!filtered.length) return null;
    return filtered.join('\n');
  }

  private async clearAutoExpiredState(subscriptionId: string): Promise<void> {
    try {
      const sub = await this._prismaService.subscriptions.findUnique({
        where: { subscription_id: subscriptionId },
        select: {
          status: true,
          cancel_at_period_end: true,
          notes: true,
        },
      });
      if (!sub) return;

      const cleanedNotes = this.stripAutoExpiredNote(sub.notes);
      const needsCancelReset = sub.cancel_at_period_end;
      const wasExpired = sub.status === 'expired';
      const notesChanged = cleanedNotes !== (sub.notes ?? null);

      if (!wasExpired && !needsCancelReset && !notesChanged) return;

      await this._prismaService.subscriptions.update({
        where: { subscription_id: subscriptionId },
        data: {
          status: wasExpired ? 'active' : sub.status,
          cancel_at_period_end: false,
          notes: cleanedNotes,
        },
      });
    } catch (err) {
      this.logger.warn(
        `[clearAutoExpiredState] Failed to clear auto-expired flags for subscription ${subscriptionId}: ${String(
          err instanceof Error ? err.message : err,
        )}`,
      );
    }
  }

  /**
   * Confirms payment and creates/updates subscription for a user
   *
   * @param userId - The user ID who made the payment
   * @param paymentIdOrTxnRef - Payment ID or transaction reference from payment gateway
   * @param planCode - Optional plan code to override the plan from payment record
   * @returns Confirmation result with status and subscription details
   *
   * Compound key handling: Uses code + is_current filter to ensure the latest active
   * version of the plan is used for subscription creation
   */
  async confirmPaid(userId: string, paymentIdOrTxnRef: string, planCode?: string) {
    this.logger.log(`Confirming payment for user ${userId}, payment: ${paymentIdOrTxnRef}`);

    return this._prismaService.$transaction(async (_prisma) => {
      const clean = (paymentIdOrTxnRef || '').replace(/-/g, '');
      this.logger.debug(`Finding payment with clean ref: ${clean}`);

      const payment = await _prisma.payments.findFirst({
        where: { OR: [{ payment_id: paymentIdOrTxnRef }, { vnp_txn_ref: clean }] },
        include: { user: true },
      });

      if (!payment) {
        this.logger.warn(`Payment not found for user ${userId}, ref: ${paymentIdOrTxnRef}`);
        return { status: 'error', message: 'Payment not found' };
      }

      if (!this.isPaymentPaid(payment)) {
        this.logger.warn(`Payment not successful, status: ${payment.status}`);
        return { status: 'error', message: 'Payment not successful' };
      }

      // Idempotency check
      let existingEvent = await _prisma.subscription_histories.findFirst({
        where: {
          event_type: 'activated',
          OR: [
            { payment_id: payment.payment_id },
            { event_data: { path: ['paymentId'], equals: payment.payment_id } },
          ],
        },
        include: {
          subscription: {
            include: { plans: true },
          },
        },
      });

      if (existingEvent?.subscription) {
        this.logger.log(
          `Payment ${payment.payment_id} already processed, returning existing subscription`,
        );
        return {
          status: 'active',
          subscription: this.convertBigIntToString(existingEvent.subscription),
        };
      }

      this.logger.log(`Found successful payment: ${payment.payment_id}, amount: ${payment.amount}`);

      // Tìm transaction liên kết với payment
      // Try to load transaction using repository bound to transaction client if available
      // Find transaction linked to this payment within the transaction client
      let transaction =
        (await _prisma.transactions.findFirst({
          where: {
            OR: [{ payment_id: payment.payment_id }, { provider_payment_id: payment.payment_id }],
          },
        })) || null;

      if (!transaction) {
        this.logger.warn(
          `[confirmPaid] Transaction không tìm thấy cho payment ${payment.payment_id}, tạo fallback transaction/subscription`,
        );

        // Fallback strategy:
        // 1) Try to find an existing active subscription for this user and plan
        // 2) If none exists, create a minimal subscription record
        // 3) Create and link a transaction to allow confirmation to proceed

        let fallbackSub = await _prisma.subscriptions.findFirst({
          where: {
            user_id: userId,
            plan_code: this.extractPlanCodeFromPayment(payment).toLowerCase(),
            status: { in: ['trialing', 'active', 'past_due', 'paused'] },
          },
          include: {
            plans: true,
          },
        });

        if (!fallbackSub) {
          this.logger.debug(
            `[confirmPaid] Không tìm thấy subscription phù hợp, tạo subscription mới tạm thời`,
          );
          const requestedCode = this.extractPlanCodeFromPayment(payment).toLowerCase();
          let plan = requestedCode ? await this._planRepository.findByCode(requestedCode) : null;

          if (!plan) {
            this.logger.debug(
              `[confirmPaid] Plan ${requestedCode} không tìm thấy, fallback về basic`,
            );
            plan = await this._planRepository.findByCode('basic');
          }

          if (!plan) {
            this.logger.error('[confirmPaid] Không tìm thấy plan hợp lệ để tạo subscription');
            throw new Error('Fallback plan not found');
          }

          const now = new Date();
          const fallbackBillingPeriodRaw = plan?.billing_period as BillingPeriod | undefined;
          const fallbackBillingPeriod =
            fallbackBillingPeriodRaw && fallbackBillingPeriodRaw !== 'none'
              ? fallbackBillingPeriodRaw
              : 'monthly';
          const nextPeriodEnd = this.addBillingPeriod(now, fallbackBillingPeriod);

          fallbackSub = await _prisma.subscriptions.create({
            data: {
              user_id: userId,
              plan_code: plan?.code || 'basic',
              plan_id: plan?.id,
              plan_snapshot: plan ? this.convertBigIntToString(plan) : {},
              status: 'active',
              billing_period: fallbackBillingPeriod,
              started_at: now,
              current_period_start: now,
              current_period_end: nextPeriodEnd,
              auto_renew: true,
            },
            include: {
              plans: true,
            },
          });

          if (!fallbackSub) {
            this.logger.error('[confirmPaid] Failed to create fallback subscription');
            throw new Error('Fallback subscription creation failed');
          }

          this.logger.log(
            `[confirmPaid] Đã tạo subscription tạm thời ${fallbackSub.subscription_id}`,
          );
        }

        // Create a minimal transaction linked to this payment + subscription
        const now = new Date();
        const periodEnd = this.addBillingPeriod(
          now,
          (fallbackSub.billing_period as BillingPeriod) || 'monthly',
        );
        const planSnapshotSource =
          fallbackSub.plans ??
          (await _prisma.plans.findFirst({
            where: { code: fallbackSub.plan_code, is_current: true },
          }));
        const normalizedSnapshot = planSnapshotSource
          ? this.convertBigIntToString(planSnapshotSource)
          : undefined;

        // Derive tax/subtotal if payment contains delivery_data with breakdown.
        const delivery = (payment as any)?.delivery_data ?? {};
        let amountTotal = BigInt(payment.amount ?? 0);
        let amountTax = BigInt(0);
        let amountSubtotal = amountTotal;

        try {
          if (delivery && typeof delivery === 'object') {
            if (delivery.tax_amount !== undefined && delivery.tax_amount !== null) {
              amountTax = BigInt(String(delivery.tax_amount));
            } else if (delivery.tax !== undefined && delivery.tax !== null) {
              amountTax = BigInt(String(delivery.tax));
            } else if ((payment as any).tax !== undefined && (payment as any).tax !== null) {
              amountTax = BigInt(String((payment as any).tax));
            }

            if (delivery.subtotal !== undefined && delivery.subtotal !== null) {
              amountSubtotal = BigInt(String(delivery.subtotal));
            } else {
              // If subtotal not provided, derive from total - tax
              amountSubtotal = amountTotal - amountTax;
            }
          }
        } catch {
          // Defensive: fall back to payment.amount when parsing fails
          amountTax = BigInt(0);
          amountSubtotal = amountTotal;
        }

        transaction = await _prisma.transactions.create({
          data: {
            subscription_id: fallbackSub.subscription_id,
            plan_code:
              this.extractPlanCodeFromPayment(payment) || (fallbackSub as any).plan_code || '',
            plan_snapshot: normalizedSnapshot ?? {},
            plan_snapshot_new: normalizedSnapshot ?? {},
            amount_subtotal: amountSubtotal,
            amount_discount: 0n,
            amount_tax: amountTax,
            amount_total: amountTotal,
            currency: 'VND',
            period_start: now,
            period_end: periodEnd,
            effective_action: 'new',
            status: 'paid' as any,
            paid_at: now,
            provider: 'vn_pay',
            provider_payment_id: payment.payment_id,
            payment_id: payment.payment_id,
            is_proration: false,
          },
          include: {
            subscriptions: true,
          },
        });

        if (transaction) {
          this.logger.log(
            `[confirmPaid] Tạo fallback transaction ${transaction.tx_id} liên kết với payment ${payment.payment_id}`,
          );
        }
      }

      if (!transaction) {
        this.logger.error(
          `[confirmPaid] Không thể tạo hoặc tìm transaction cho payment ${payment.payment_id}`,
        );
        return { status: 'error', message: 'Transaction creation failed' };
      }

      // Ensure the transaction has the explicit payment_id populated for future lookups
      if (!(transaction as any).payment_id) {
        try {
          await _prisma.transactions.update({
            where: { tx_id: transaction.tx_id },
            data: { payment_id: payment.payment_id },
          });
          (transaction as any).payment_id = payment.payment_id;
        } catch (err) {
          this.logger.warn(
            `[confirmPaid] Không thể gắn payment_id cho transaction ${transaction.tx_id}: ${String(
              err instanceof Error ? err.message : err,
            )}`,
          );
        }
      }

      this.logger.debug(
        `[confirmPaid] Tìm thấy transaction: ${transaction.tx_id}, subscription_id: ${transaction.subscription_id}`,
      );

      // Tìm subscription đúng theo transaction
      let sub = await _prisma.subscriptions.findFirst({
        where: { subscription_id: transaction.subscription_id, user_id: userId },
        include: { plans: true },
      });

      if (!sub) {
        this.logger.error(
          `[confirmPaid] Subscription không tìm thấy: ${transaction.subscription_id} cho user ${userId}`,
        );
        return { status: 'error', message: 'Subscription not found for this transaction' };
      }

      const code = (planCode || this.extractPlanCodeFromPayment(payment) || '').toLowerCase();
      if (!code) {
        this.logger.warn(`[confirmPaid] Thiếu plan_code trong payment ${payment.payment_id}`);
        return { status: 'error', message: 'Missing plan_code' };
      }

      const plan = await this.findCurrentPlanByCode(code);
      if (!plan) {
        this.logger.error(`[confirmPaid] Plan không tìm thấy: ${code}`);
        return { status: 'error', message: `Unknown plan_code: ${code}` };
      }

      this.logger.log(
        `[confirmPaid] Chuẩn bị cập nhật subscription ${sub.subscription_id} với plan ${code}`,
      );

      // Cập nhật subscription
      const now = new Date();

      // Use advisory lock on subscription to avoid concurrent modifications and duplicate events
      await _prisma.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${sub.subscription_id}))`;

      const resolvedBillingPeriod = (
        sub.billing_period && sub.billing_period !== 'none'
          ? (sub.billing_period as BillingPeriod)
          : plan.billing_period && plan.billing_period !== 'none'
            ? (plan.billing_period as BillingPeriod)
            : 'monthly'
      ) as BillingPeriod;

      const subscriptionPlanSnapshot = plan ? this.convertBigIntToString(plan) : undefined;

      const updatedSub = await _prisma.subscriptions.update({
        where: { subscription_id: sub.subscription_id },
        data: {
          plan_code: plan.code,
          plan_id: plan.id,
          status: 'active',
          billing_period: resolvedBillingPeriod,
          current_period_start: sub.current_period_start ?? now,
          current_period_end: !sub.current_period_end
            ? this.addBillingPeriod(
                sub.current_period_start ?? now,
                resolvedBillingPeriod === 'none' ? 'monthly' : resolvedBillingPeriod,
              )
            : sub.current_period_end,
          auto_renew: sub.auto_renew ?? true,
          last_payment_at: now,
          cancel_at_period_end: false,
          notes: this.stripAutoExpiredNote(sub.notes),
          ...(subscriptionPlanSnapshot ? { plan_snapshot: subscriptionPlanSnapshot } : {}),
        },
        include: { plans: true },
      });

      this.logger.log(
        `[confirmPaid] Đã cập nhật subscription ${updatedSub.subscription_id}, status: ${updatedSub.status}, period_end: ${updatedSub.current_period_end}`,
      );

      // Ensure subscription.plan_id is present and linked to a plan record
      try {
        if (!updatedSub.plan_id && plan && plan.id) {
          await _prisma.subscriptions.update({
            where: { subscription_id: updatedSub.subscription_id },
            data: { plan_id: plan.id },
          });
        }
      } catch (err) {
        this.logger.error(
          `[confirmPaid] Failed to ensure plan_id for subscription ${updatedSub.subscription_id}:`,
          err,
        );
      }

      // Use repository helper to create activated event idempotently inside the same transaction
      try {
        await this._subscriptionEventRepository.createIfNotExistsByEventDataInTransaction(
          _prisma as any,
          updatedSub.subscription_id,
          'activated',
          'paymentId',
          payment.payment_id,
          {
            subscription_id: updatedSub.subscription_id,
            event_type: 'activated',
            event_data: {
              paymentId: payment.payment_id,
              amount: Number(payment.amount),
              plan: code,
              status: payment.status,
              transactionId: transaction?.tx_id,
            },
            // Also populate scalar columns for robust idempotency lookups
            payment_id: payment.payment_id,
            tx_id: transaction?.tx_id ?? undefined,
            payment: { connect: { payment_id: payment.payment_id } } as any,
            ...(transaction?.tx_id
              ? ({ transaction: { connect: { tx_id: transaction.tx_id } } } as any)
              : {}),
            created_at: now,
          } as any,
        );
      } catch (err) {
        this.logger.error(`[confirmPaid] Failed to create activated event idempotently:`, err);
        // Continue: subscription already updated; do not fail the whole flow for event insert race
      }

      this.logger.log(`[confirmPaid] Hoàn tất xử lý payment thành công cho user ${userId}`);
      return { status: 'active', subscription: updatedSub };
    });
  }
  async getActive(userId: string) {
    const subscription = await this.findActiveSubscription(userId);
    if (!subscription) return null;

    const rawPlan =
      subscription.plans ??
      (subscription.plan_code ? await this.findCurrentPlanByCode(subscription.plan_code) : null);

    const ensuredPlan = await this.ensureSubscriptionDefaults(subscription, rawPlan);

    const converted = this.convertBigIntToString(subscription);
    const normalized: any = { ...converted };

    try {
      if (ensuredPlan) {
        normalized.plan = this.convertBigIntToString(ensuredPlan);
      } else if (normalized.plans) {
        normalized.plan = this.convertBigIntToString(normalized.plans);
      } else if (normalized.plan_code) {
        const fallbackPlan = await this._planRepository.findByCode(String(normalized.plan_code));
        normalized.plan = fallbackPlan ? this.convertBigIntToString(fallbackPlan) : null;
      } else {
        normalized.plan = null;
      }
    } catch (err) {
      this.logger.warn(
        `[getActive] Failed to enrich plan for subscription ${normalized.subscription_id}: ${String(
          err instanceof Error ? err.message : err,
        )}`,
      );
      normalized.plan = null;
    }

    if (!normalized.plan_id && normalized.plan && (normalized.plan as any).id) {
      normalized.plan_id = (normalized.plan as any).id;
    }

    if (!normalized.version && normalized.plan && (normalized.plan as any).version) {
      normalized.version = (normalized.plan as any).version;
    }

    if (!normalized.billing_period || normalized.billing_period === 'none') {
      normalized.billing_period =
        (normalized.plan && (normalized.plan as any).billing_period) || 'monthly';
    }

    normalized.plans = normalized.plan;

    return normalized;
  }

  /**
   * Generate a manual renewal payment link for the currently active subscription.
   * Used when auto-renewal is disabled (no stored wallet) but the user wants to renew.
   */
  async requestManualRenewal(
    userId: string,
    options?: {
      ipAddress?: string;
      billingPeriod?: BillingPeriod;
      billingType?: PlanBillingType;
    },
  ): Promise<{
    paymentId: string;
    paymentUrl: string;
    plan_code: string;
    plan_name?: string | null;
    amount: number;
    subscription_id: string;
    billing_period: BillingPeriod;
    billing_type: PlanBillingType;
  }> {
    if (!this._paymentService?.createVnpayPayment) {
      throw new Error('Payment service not available');
    }

    const subscription = await this.findActiveSubscription(userId);
    if (!subscription) {
      throw new Error('Không tìm thấy subscription đang hoạt động');
    }

    if (!subscription.plan_code) {
      throw new Error('Subscription không có thông tin plan_code');
    }

    // Prefer a stored snapshot on the subscription for deterministic renewals.
    const planSnapshotRecord = subscription.plan_snapshot
      ? this.convertBigIntToString(subscription.plan_snapshot)
      : null;
    const planRecord =
      (planSnapshotRecord || subscription.plans) ??
      (await this._planRepository.findByCode(subscription.plan_code));
    const ensuredPlan = await this.ensureSubscriptionDefaults(subscription, planRecord);
    const planToUse = ensuredPlan ?? planRecord;
    const planName = planToUse?.name ?? subscription.plan_code;
    const ipAddress =
      options?.ipAddress && options.ipAddress.trim().length > 0
        ? options.ipAddress.trim()
        : '127.0.0.1';
    const requestedBillingPeriod = options?.billingPeriod;
    if (requestedBillingPeriod && !['monthly'].includes(requestedBillingPeriod)) {
      throw new Error('billing_period không hợp lệ (chỉ hỗ trợ monthly)');
    }

    const selectedBillingPeriod = this.resolveBillingPeriod(
      subscription,
      planToUse,
      requestedBillingPeriod as BillingPeriod | undefined,
    );
    const selectedBillingType = this.resolveBillingType(planToUse, options?.billingType ?? null);

    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    const existingPendingPayment =
      this._paymentService &&
      (await this._prismaService.payments.findFirst({
        where: {
          user_id: userId,
          status: 'pending',
          provider: 'vn_pay',
          created_at: { gte: fifteenMinutesAgo },
          transactions: {
            is: {
              subscription_id: subscription.subscription_id,
            },
          },
        },
        select: {
          payment_id: true,
          amount: true,
          description: true,
          delivery_data: true,
        },
        orderBy: { created_at: 'desc' },
      }));

    const existingBillingPeriod = existingPendingPayment
      ? ((existingPendingPayment.delivery_data as any)?.billing_period as BillingPeriod | undefined)
      : undefined;
    const existingBillingType = existingPendingPayment
      ? (this.normalizeBillingType((existingPendingPayment.delivery_data as any)?.billing_type) ??
        PlanBillingType.PREPAID)
      : PlanBillingType.PREPAID;

    if (
      existingPendingPayment &&
      this._paymentService?.regenerateVnpayPaymentLink &&
      (!requestedBillingPeriod || requestedBillingPeriod === existingBillingPeriod) &&
      (!options?.billingType || options.billingType === existingBillingType)
    ) {
      try {
        const amountMajor =
          typeof existingPendingPayment.amount === 'bigint'
            ? Number(existingPendingPayment.amount)
            : Number(existingPendingPayment.amount ?? 0);

        const regenerated = await this._paymentService.regenerateVnpayPaymentLink(
          existingPendingPayment.payment_id,
          {
            ipAddr: ipAddress,
            descriptionOverride: existingPendingPayment.description || `Renewal for ${planName}`,
            amountOverride:
              amountMajor > 0
                ? amountMajor
                : this.calculateBillingAmount(planToUse ?? null, selectedBillingPeriod),
          },
        );

        return {
          paymentId: existingPendingPayment.payment_id,
          paymentUrl: regenerated.paymentUrl,
          plan_code: subscription.plan_code,
          plan_name: planName,
          amount:
            amountMajor > 0
              ? amountMajor
              : this.calculateBillingAmount(planToUse ?? null, selectedBillingPeriod),
          subscription_id: subscription.subscription_id,
          billing_period: existingBillingPeriod ?? selectedBillingPeriod,
          billing_type: existingBillingType ?? selectedBillingType,
        };
      } catch (err) {
        this.logger.warn(
          `[requestManualRenewal] Failed to recycle pending payment ${existingPendingPayment.payment_id}: ${String(
            err instanceof Error ? err.message : err,
          )}. Continuing with new payment creation.`,
        );
      }
    }

    const payload: CreatePaymentDto = {
      user_id: userId,
      plan_code: subscription.plan_code,
      description: `Renewal for ${planName}`,
      billing_period: selectedBillingPeriod === 'none' ? undefined : selectedBillingPeriod,
      billing_type: selectedBillingType,
    };

    const paymentResult = await this._paymentService.createVnpayPayment(
      payload,
      ipAddress,
      undefined,
      // prefer subscription snapshot when available to honor grandfathered pricing
      planSnapshotRecord ?? planToUse ?? undefined,
    );

    return {
      paymentId: paymentResult.paymentId,
      paymentUrl: paymentResult.paymentUrl,
      plan_code: subscription.plan_code,
      plan_name: planName,
      amount: this.calculateBillingAmount(planToUse ?? null, selectedBillingPeriod),
      subscription_id: subscription.subscription_id,
      billing_period: selectedBillingPeriod,
      billing_type: selectedBillingType,
    };
  }

  async cancelPendingManualRenewal(userId: string, reason?: string) {
    const subscription = await this.findActiveSubscription(userId);
    if (!subscription) {
      throw new Error('Không tìm thấy subscription đang hoạt động');
    }

    const pendingPayment = await this._prismaService.payments.findFirst({
      where: {
        user_id: userId,
        status: 'pending',
        provider: 'vn_pay',
        transactions: {
          is: {
            subscription_id: subscription.subscription_id,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    if (!pendingPayment) {
      throw new Error('Không có payment pending cần hủy');
    }

    if (!this._paymentService?.cancelPendingVnpayPayment) {
      throw new Error('Payment service không hỗ trợ hủy payment');
    }

    await this._paymentService.cancelPendingVnpayPayment(pendingPayment.payment_id, {
      reason,
    });

    const delivery = (pendingPayment.delivery_data as any) ?? {};
    const resolvedBillingPeriod = this.resolveBillingPeriod(
      subscription,
      subscription.plans,
      delivery.billing_period as BillingPeriod | undefined,
    );
    const resolvedBillingType =
      this.normalizeBillingType(delivery.billing_type) ?? PlanBillingType.PREPAID;

    await this.logEvent(subscription.subscription_id, 'renewal_cancelled', {
      paymentId: pendingPayment.payment_id,
      reason,
      billing_period: resolvedBillingPeriod,
      billing_type: resolvedBillingType,
    });

    return {
      paymentId: pendingPayment.payment_id,
      status: 'cancelled',
      billing_period: resolvedBillingPeriod,
      billing_type: resolvedBillingType,
    };
  }

  async getPendingManualRenewal(userId: string) {
    const subscription = await this.findActiveSubscription(userId);
    if (!subscription) {
      return null;
    }

    // Prefer a stored snapshot on the subscription for deterministic renewals.
    const planSnapshotRecord = subscription.plan_snapshot
      ? this.convertBigIntToString(subscription.plan_snapshot)
      : null;
    const planRecord =
      (planSnapshotRecord || subscription.plans) ??
      (await this._planRepository.findByCode(subscription.plan_code));
    const ensuredPlan = await this.ensureSubscriptionDefaults(subscription, planRecord);
    const planToUse = ensuredPlan ?? planRecord;

    const pendingPayment = await this._prismaService.payments.findFirst({
      where: {
        user_id: userId,
        status: 'pending',
        provider: 'vn_pay',
        transactions: {
          is: {
            subscription_id: subscription.subscription_id,
          },
        },
      },
      orderBy: { created_at: 'desc' },
      select: {
        payment_id: true,
        amount: true,
        description: true,
        delivery_data: true,
        created_at: true,
        vnp_txn_ref: true,
      },
    });

    if (!pendingPayment) return null;

    const amountMajor =
      typeof pendingPayment.amount === 'bigint'
        ? Number(pendingPayment.amount)
        : Number(pendingPayment.amount ?? 0);

    const expiresAt = new Date(pendingPayment.created_at.getTime() + 15 * 60 * 1000);

    const delivery = (pendingPayment.delivery_data as any) ?? {};
    const resolvedBillingPeriod = this.resolveBillingPeriod(
      subscription,
      planToUse,
      delivery.billing_period as BillingPeriod | undefined,
    );
    const resolvedBillingType =
      this.normalizeBillingType(delivery.billing_type) ?? PlanBillingType.PREPAID;
    const normalizedAmount =
      amountMajor > 0
        ? amountMajor
        : this.calculateBillingAmount(planToUse ?? null, resolvedBillingPeriod);

    return {
      paymentId: pendingPayment.payment_id,
      amount: normalizedAmount,
      description: pendingPayment.description,
      createdAt: pendingPayment.created_at,
      expiresAt,
      vnpTxnRef: pendingPayment.vnp_txn_ref,
      billing_period: resolvedBillingPeriod,
      billing_type: resolvedBillingType,
    };
  }

  /**
   * Creates a free basic subscription for a new user
   *
   * @param userId - The user ID to create the free subscription for
   * @returns The created subscription record
   *
   * Compound key handling: Uses code='basic' + is_current=true to get the current
   * active version of the basic plan for the free subscription
   */
  async createFree(userId: string) {
    this.logger.log(`Creating free subscription for user ${userId}`);

    const existing = await this.getActive(userId);
    if (existing) {
      this.logger.log(
        `User ${userId} already has active subscription: ${existing.subscription_id}`,
      );
      return existing;
    }

    const plan = await this.findCurrentPlanByCode('basic');
    if (!plan) {
      this.logger.error('Basic plan not found');
      throw new Error('Basic plan not available');
    }

    const sub = await this._prismaService.subscriptions.create({
      data: {
        user_id: userId,
        plan_code: plan.code,
        plan_id: plan.id,
        plan_snapshot: plan ? this.convertBigIntToString(plan) : {},
        status: 'active',
        billing_period: 'none',
        auto_renew: false,
      },
      include: {
        plans: true,
      },
    });

    await this.logEvent(sub.subscription_id, 'created');

    this.logger.log(
      `[createFree] Đã tạo subscription miễn phí thành công: ${sub.subscription_id} cho user ${userId} với plan basic version ${plan.version}`,
    );

    // Normalize and return same shape as getActive (enriched plan + converted bigint fields)
    const normalized = await this.getActive(userId);
    return normalized;
  }

  /**
   * CHỈ tính proration + tạo transaction.
   * - Nếu amountDue==0: áp dụng ngay (đổi plan + entitlements)
   * - Nếu >0: KHÔNG đổi plan; controller/orchestrator sẽ tạo payment
   *
   * @param dto - Upgrade request containing user ID, subscription ID, and target plan code
   * @returns Upgrade preparation result with proration details and transaction info
   *
   * Compound key handling: Uses plan_code + is_current=true to ensure the latest
   * active version of the target plan is used for upgrade calculations
   */
  async prepareUpgrade(dto: {
    userId: string;
    subscriptionId: string;
    plan_code: string;
    paymentProvider: string;
    idempotencyKey?: string;
  }) {
    this.logger.log(
      `[prepareUpgrade] Delegating to SubscriptionUpgradeService for user ${dto.userId}, subscription ${dto.subscriptionId} to plan ${dto.plan_code}`,
    );

    // Cancel any pending scheduled downgrade for this subscription (if exists)
    try {
      const scheduled = await this._prismaService.subscription_histories.findFirst({
        where: {
          subscription_id: dto.subscriptionId,
          event_type: 'downgrade_scheduled',
        },
        orderBy: { created_at: 'desc' },
      } as any);

      if (scheduled) {
        const eff = (scheduled.event_data as any)?.effective_at;
        const effDate = eff ? new Date(eff) : null;
        if (effDate && effDate > new Date()) {
          // create a cancel event (idempotent approach: always write cancel event)
          await this._prismaService.subscription_histories.create({
            data: {
              subscription_id: dto.subscriptionId,
              event_type: 'downgrade_canceled' as any,
              event_data: {
                scheduled_id: scheduled.id,
                canceled_at: new Date().toISOString(),
                reason: 'user_requested_upgrade',
              },
            } as any,
          } as any);
          this.logger.log(
            `[prepareUpgrade] Canceled scheduled downgrade id=${scheduled.id} for subscription ${dto.subscriptionId} due to upgrade`,
          );
        }
      }
    } catch (err) {
      // Non-fatal: log and continue to prepare upgrade
      this.logger.warn(
        `[prepareUpgrade] Error checking/canceling scheduled downgrade: ${(err as Error).message}`,
      );
    }

    return this._subscriptionUpgradeService.prepareUpgrade(dto);
  }

  async prepareDowngrade(dto: {
    userId: string;
    subscriptionId: string;
    plan_code: string;
    paymentProvider?: string;
    idempotencyKey?: string;
  }) {
    this.logger.log(
      `[prepareDowngrade] Delegating to SubscriptionDowngradeService for user ${dto.userId}, subscription ${dto.subscriptionId} to plan ${dto.plan_code}`,
    );

    return this._subscriptionDowngradeService.prepareDowngrade({
      ...dto,
      paymentProvider: dto.paymentProvider || 'manual', // Default to manual if not provided
    });
  }

  /**
   * Schedule a downgrade to be applied at effectiveAt (typically end of billing period).
   * This is a minimal implementation that records a scheduled downgrade event into
   * subscription_histories so workers or operators can apply it later.
   */
  async scheduleDowngrade(dto: {
    userId: string;
    subscriptionId: string;
    plan_code: string;
    effectiveAt: Date | string;
    idempotencyKey?: string;
  }) {
    this.logger.log(
      `[scheduleDowngrade] Lập lịch downgrade cho subscription ${dto.subscriptionId} sang ${dto.plan_code} effectiveAt=${dto.effectiveAt}`,
    );

    // Basic validation: ensure subscription exists and belongs to user
    const sub = await this.getActive(dto.userId);
    if (!sub || sub.subscription_id !== dto.subscriptionId) {
      this.logger.warn(
        `[scheduleDowngrade] Subscription không tồn tại hoặc không khớp với user ${dto.userId}`,
      );
      throw new Error('subscription_not_found');
    }

    const planCode = dto.plan_code.toLowerCase();
    const plan = await this.findCurrentPlanByCode(planCode);
    if (!plan) {
      this.logger.warn(`[scheduleDowngrade] Plan ${planCode} không tồn tại hoặc không active`);
      throw new Error('plan_not_found');
    }

    const effectiveAt =
      dto.effectiveAt instanceof Date ? dto.effectiveAt : new Date(dto.effectiveAt);
    if (Number.isNaN(effectiveAt.getTime())) {
      throw new Error('invalid_effective_at');
    }

    const now = new Date();
    if (effectiveAt.getTime() <= now.getTime()) {
      throw new Error('effective_at_in_past');
    }

    if (sub.plan_code?.toLowerCase() === planCode) {
      this.logger.warn(
        `[scheduleDowngrade] Subscription ${dto.subscriptionId} đã ở plan ${planCode}, bỏ qua`,
      );
      throw new Error('already_on_target_plan');
    }

    if (sub.current_period_end && effectiveAt.getTime() < sub.current_period_end.getTime()) {
      throw new Error('effective_at_before_current_period_end');
    }

    const idempotencyKey =
      dto.idempotencyKey ?? `${dto.subscriptionId}:${planCode}:${effectiveAt.toISOString()}`;

    const existed = await this._subscriptionEventRepository.findByEventDataPath(
      dto.subscriptionId,
      'downgrade_scheduled' as any,
      'idempotency_key',
      idempotencyKey,
    );
    if (existed) {
      this.logger.log(
        `[scheduleDowngrade] Đã tồn tại downgrade schedule id=${(existed as any).id} với idempotency_key=${idempotencyKey}`,
      );
      return {
        scheduled: false,
        reason: 'already_scheduled',
        recordId: (existed as any).id,
        subscriptionId: dto.subscriptionId,
        plan_code: planCode,
        effectiveAt,
      };
    }

    const created = await this._prismaService.subscription_histories.create({
      data: {
        subscription_id: dto.subscriptionId,
        event_type: 'downgrade_scheduled' as any,
        event_data: {
          type: 'downgrade_scheduled',
          plan_code: planCode,
          plan_version: plan.version ?? null,
          effective_at: effectiveAt.toISOString(),
          idempotency_key: idempotencyKey,
        },
      },
    });

    const downgradeSnapshotCurrent = sub.plans ? this.convertBigIntToString(sub.plans) : {};
    const downgradeSnapshotTarget = this.convertBigIntToString(plan);

    let scheduledTx = await this._prismaService.transactions.findFirst({
      where: {
        subscription_id: dto.subscriptionId,
        effective_action: 'downgrade',
        idempotency_key: idempotencyKey,
      },
    });

    if (!scheduledTx) {
      scheduledTx = await this._prismaService.transactions.create({
        data: {
          subscription_id: dto.subscriptionId,
          plan_code: plan.code,
          plan_id: plan.id,
          plan_snapshot: downgradeSnapshotCurrent ?? {},
          plan_snapshot_new: downgradeSnapshotTarget ?? {},
          amount_subtotal: 0n,
          amount_total: 0n,
          currency: 'VND',
          period_start: effectiveAt,
          period_end: effectiveAt,
          status: 'paid' as any,
          effective_action: 'downgrade',
          provider: 'manual',
          idempotency_key: idempotencyKey,
          notes: 'Scheduled downgrade via API',
          is_proration: false,
        },
      });
    }

    return {
      scheduled: true,
      subscriptionId: dto.subscriptionId,
      plan_code: planCode,
      effectiveAt,
      recordId: (created as any).id,
      transactionId: scheduledTx.tx_id,
    };
  }

  /**
   * Deprecated: dùng prepareUpgrade + orchestrator. Giữ lại để backward compatibility.
   */
  async upgrade(dto: {
    userId: string;
    subscriptionId: string;
    plan_code: string;
    paymentProvider: string;
    quantity?: number;
    type?: string;
    idempotencyKey?: string;
  }): Promise<any> {
    // Chuyển sang gọi prepareUpgrade cho đúng orchestrator pattern
    return this.prepareUpgrade(dto);
  }

  async pause(userId: string, reason?: string) {
    this.logger.log(`Pausing subscription for user ${userId}`);

    const sub = await this.findActiveSubscription(userId);
    if (!sub) {
      this.logger.warn(`No active subscription found for user ${userId}`);
      return null;
    }

    this.logger.debug(`Pausing subscription ${sub.subscription_id} from status ${sub.status}`);

    await this._prismaService.subscriptions.update({
      where: { subscription_id: sub.subscription_id },
      data: {
        status: 'paused',
        notes: reason || sub.notes,
      },
    });

    await this.logEvent(sub.subscription_id, 'paused');

    this.logger.log(`Successfully paused subscription ${sub.subscription_id} for user ${userId}`);
    return { ...sub, status: 'paused', notes: reason || sub.notes };
  }

  async resume(userId: string) {
    this.logger.log(`Resuming subscription for user ${userId}`);

    const sub = await this.findActiveSubscription(userId);
    if (!sub) {
      this.logger.warn(`No active subscription found for user ${userId}`);
      return null;
    }

    this.logger.debug(`Resuming subscription ${sub.subscription_id} from status ${sub.status}`);

    const updatedSub = await this._prismaService.subscriptions.update({
      where: { subscription_id: sub.subscription_id },
      data: { status: 'active' },
      include: { plans: true },
    });

    await this.logEvent(updatedSub.subscription_id, 'resumed');

    this.logger.log(
      `Successfully resumed subscription ${updatedSub.subscription_id} for user ${userId}`,
    );
    return updatedSub;
  }

  async cancel(userId: string) {
    // Theo chính sách mới: Hủy mặc định là cuối kỳ, không hoàn tiền, chuyển về Basic
    return this.cancelWithPolicy(userId, {
      reason: 'User requested cancellation (policy: end of period, downgrade to Basic)',
    });
  }

  /**
   * Get user ID from subscription ID
   */
  private async getUserIdFromSubscriptionId(subscriptionId: string): Promise<string> {
    const sub = await this._prismaService.subscriptions.findUnique({
      where: { subscription_id: subscriptionId },
      select: { user_id: true },
    });
    if (!sub) {
      throw new Error(`Subscription ${subscriptionId} not found`);
    }
    return sub.user_id;
  }

  /**
   * Find active subscription for a user
   */
  private async findActiveSubscription(userId: string) {
    return await this._prismaService.subscriptions.findFirst({
      where: {
        user_id: userId,
        status: { in: ['trialing', 'active', 'past_due', 'paused'] },
      },
      include: {
        plans: true,
      },
      orderBy: { started_at: 'desc' },
    });
  }

  /**
   * Find subscription by ID with optional includes
   */
  private async findSubscriptionById(subscriptionId: string, include?: any) {
    return await this._prismaService.subscriptions.findUnique({
      where: { subscription_id: subscriptionId },
      include,
    });
  }

  /**
   * Generic wrapper method for bulk operations - work with subscriptionId instead of userId
   */
  private async executeSubscriptionAction(
    subscriptionId: string,
    action: 'pause' | 'resume' | 'cancel',
    reason?: string,
  ) {
    const userId = await this.getUserIdFromSubscriptionId(subscriptionId);

    switch (action) {
      case 'pause':
        return this.pause(userId, reason);
      case 'resume':
        return this.resume(userId);
      case 'cancel':
        return this.cancel(userId);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  /**
   * Wrapper methods for bulk operations - work with subscriptionId instead of userId
   */
  async pauseBySubscriptionId(subscriptionId: string, reason?: string) {
    return this.executeSubscriptionAction(subscriptionId, 'pause', reason);
  }

  async resumeBySubscriptionId(subscriptionId: string) {
    return this.executeSubscriptionAction(subscriptionId, 'resume');
  }

  async cancelBySubscriptionId(subscriptionId: string) {
    return this.executeSubscriptionAction(subscriptionId, 'cancel');
  }

  /**
   * Enhanced cancel method - CHÍNH SÁCH MỚI: Luôn hủy cuối kỳ, chuyển về Basic, không hoàn tiền
   */
  async cancelWithPolicy(
    userId: string,
    options: {
      reason?: string;
    } = {},
  ) {
    const { reason } = options;

    this.logger.log(
      `[cancelWithPolicy] CHÍNH SÁCH MỚI: Luôn hủy cuối kỳ về Basic, không hoàn tiền. User: ${userId}`,
    );

    // Get active subscription
    const subscription = await this.getActive(userId);
    if (!subscription) {
      throw new Error('No active subscription found');
    }

    // Validate cancellation eligibility
    await this.validateCancellationEligibility(subscription);

    const now = new Date();

    return this._prismaService.$transaction(async (prisma) => {
      // CHÍNH SÁCH MỚI: Luôn hủy cuối kỳ, chuyển về Basic, không hoàn tiền
      this.logger.log(
        `[cancelWithPolicy] Processing cancel at period end with downgrade to Basic (no refund)`,
      );

      const updatedSub = await prisma.subscriptions.update({
        where: { subscription_id: subscription.subscription_id },
        data: {
          cancel_at_period_end: true,
          canceled_at: now,
          notes: reason || subscription.notes,
        },
        include: { plans: true },
      });

      // ✅ Schedule downgrade to Basic at period end
      await this.scheduleDowngradeToBasicAtPeriodEnd(prisma, updatedSub);

      await this.logEvent(updatedSub.subscription_id, 'canceled', {
        cancel_type: 'at_period_end',
        cancel_at: updatedSub.current_period_end,
        target_plan: 'basic',
        reason: reason,
        policy: 'no_refund_downgrade_to_basic',
      });

      return {
        subscription: updatedSub,
        refund: null, // Không bao giờ có refund
        effective_date: subscription.current_period_end,
        message: `Subscription sẽ được hủy vào cuối kỳ hiện tại (${subscription.current_period_end?.toISOString().split('T')[0]}) và chuyển về gói Basic. Bạn vẫn có thể sử dụng đầy đủ quyền lợi đến thời điểm đó.`,
      };
    });
  }

  /**
   * Validate if subscription can be canceled
   */
  private async validateCancellationEligibility(subscription: any) {
    // Cannot cancel if already canceled
    if (subscription.status === 'canceled') {
      throw new Error('Subscription is already canceled');
    }

    // Cannot cancel if suspended (must reactivate first)
    if (subscription.status === 'suspended') {
      throw new Error('Cannot cancel suspended subscription. Please reactivate first.');
    }

    // Cannot cancel trial subscriptions (must wait for conversion or let it expire)
    if (subscription.status === 'trialing') {
      throw new Error('Cannot cancel trial subscription. Please wait for trial to end or upgrade.');
    }

    // Business rule: Cannot cancel within 24 hours of billing cycle start
    const cycleStart = subscription.current_period_start;
    if (cycleStart) {
      const hoursSinceCycleStart = (Date.now() - cycleStart.getTime()) / (1000 * 60 * 60);
      if (hoursSinceCycleStart < 24) {
        throw new Error('Cannot cancel subscription within 24 hours of billing cycle start');
      }
    }
  }

  /**
   * Schedule cancel at period end - user wants to cancel but continue until end of billing period
   */
  async scheduleCancelAtPeriodEnd(userId: string, reason?: string) {
    this.logger.log(
      `[scheduleCancelAtPeriodEnd] Scheduling cancel at period end for user ${userId}`,
    );

    const subscription = await this.getActive(userId);
    if (!subscription) {
      throw new Error('No active subscription found');
    }

    if (subscription.status !== 'active') {
      throw new Error('Subscription is not active');
    }

    // Update subscription to mark for cancellation at period end
    const updatedSub = await this._prismaService.subscriptions.update({
      where: { subscription_id: subscription.subscription_id },
      data: {
        cancel_at_period_end: true,
        notes: reason || subscription.notes,
      },
      include: { plans: true },
    });

    // Get user info separately
    const user = await this._prismaService.users.findUnique({
      where: { user_id: userId },
      select: { email: true, full_name: true },
    });

    await this.logEvent(updatedSub.subscription_id, 'cancel_scheduled', {
      cancel_type: 'at_period_end',
      reason: reason,
      period_end: subscription.current_period_end,
    });

    // Send confirmation notification
    if (user?.email) {
      await this._notificationService.sendEmail({
        to: user.email,
        subject: 'Subscription Cancellation Scheduled',
        html: `
          <h2>Your subscription has been scheduled for cancellation</h2>
          <p>Dear ${user.full_name || 'Customer'},</p>
          <p>Your subscription will continue until <strong>${subscription.current_period_end?.toLocaleDateString()}</strong>, after which it will be canceled and downgraded to the basic plan.</p>
          <p>If you change your mind, you can reactivate your subscription at any time before the end date.</p>
          <p>Reason: ${reason || 'Not specified'}</p>
          <br>
          <p>Best regards,<br>Healthcare VisionAI Team</p>
        `,
      });
    }

    this.logger.log(
      `[scheduleCancelAtPeriodEnd] Successfully scheduled cancel for subscription ${subscription.subscription_id}`,
    );
    return updatedSub;
  }

  /**
   * Cancel scheduled cancellation - user changed their mind
   */
  async cancelScheduledCancellation(userId: string) {
    this.logger.log(
      `[cancelScheduledCancellation] Canceling scheduled cancellation for user ${userId}`,
    );

    const subscription = await this.getActive(userId);
    if (!subscription) {
      throw new Error('No active subscription found');
    }

    if (!subscription.cancel_at_period_end) {
      throw new Error('No scheduled cancellation found');
    }

    // Remove scheduled cancellation
    const updatedSub = await this._prismaService.subscriptions.update({
      where: { subscription_id: subscription.subscription_id },
      data: {
        cancel_at_period_end: false,
      },
      include: {
        plans: true,
        users: true,
      },
    });

    await this.logEvent(updatedSub.subscription_id, 'cancel_unscheduled', {
      reason: 'User changed mind',
    });

    // Send confirmation notification
    if (updatedSub.users?.email) {
      await this._notificationService.sendEmail({
        to: updatedSub.users.email,
        subject: 'Subscription Cancellation Canceled',
        html: `
          <h2>Your subscription cancellation has been canceled</h2>
          <p>Dear ${updatedSub.users.full_name || 'Customer'},</p>
          <p>We've canceled your scheduled subscription cancellation. Your subscription will continue as normal.</p>
          <br>
          <p>Best regards,<br>Healthcare VisionAI Team</p>
        `,
      });
    }

    this.logger.log(
      `[cancelScheduledCancellation] Successfully canceled scheduled cancellation for subscription ${subscription.subscription_id}`,
    );
    return updatedSub;
  }

  /**
   * Send expiration notifications to users whose subscriptions are expiring soon
   */
  async sendExpirationNotifications() {
    this.logger.log(`[sendExpirationNotifications] Checking for subscriptions expiring soon`);

    // Find subscriptions that will cancel at period end within the next 3 days
    const expiringSoon = await this._prismaService.subscriptions.findMany({
      where: {
        cancel_at_period_end: true,
        current_period_end: {
          lte: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // Within 3 days
          gte: new Date(), // Not already expired
        },
        status: { in: ['trialing', 'active', 'past_due'] },
      },
      include: {
        users: true,
        plans: true,
      },
    });

    for (const subscription of expiringSoon) {
      if (subscription.users?.email) {
        await this._notificationService.sendEmail({
          to: subscription.users.email,
          subject: 'Your Subscription Will End Soon',
          html: `
            <h2>Your subscription is ending soon</h2>
            <p>Dear ${subscription.users.full_name || 'Customer'},</p>
            <p>Your subscription to the ${subscription.plans?.name || 'plan'} will end on <strong>${subscription.current_period_end?.toLocaleDateString()}</strong>.</p>
            <p>After this date, your account will be downgraded to the basic plan with limited features.</p>
            <p>If you'd like to continue your current plan, please renew your subscription before the end date.</p>
            <br>
            <p>Best regards,<br>Healthcare VisionAI Team</p>
          `,
        });
      }
    }

    this.logger.log(
      `[sendExpirationNotifications] Sent notifications to ${expiringSoon.length} users`,
    );
  }

  /**
   * Renew subscription by extending the period
   */
  private async renewSubscription(subscription: any) {
    this.logger.log(`[renewSubscription] Renewing subscription ${subscription.subscription_id}`);

    // Delegate to PaymentService to perform idempotent transactional auto-renew.
    // PaymentService.createAutoRenewalPayment will create payment + transaction
    // and extend the subscription atomically if the charge succeeds.
    try {
      const res = await this._paymentService?.createAutoRenewalPayment?.(subscription as any);
      if (res && res.success) {
        this.logger.log(
          `[renewSubscription] Auto-renewal succeeded for ${subscription.subscription_id}`,
        );
      } else {
        this.logger.warn(
          `[renewSubscription] Auto-renewal failed for ${subscription.subscription_id}: ${res?.error || 'unknown'}`,
        );
      }
    } catch (err) {
      this.logger.error(
        `[renewSubscription] Error during auto-renewal for ${subscription.subscription_id}:`,
        err,
      );
    }
  }

  /**
   * Downgrade expired subscription to basic plan
   */
  private async downgradeToBasicPlan(subscription: any) {
    this.logger.log(
      `[downgradeToBasicPlan] Downgrading subscription ${subscription.subscription_id} to basic plan`,
    );

    // Find the basic plan (assuming it's the one with code 'basic' or the cheapest active plan)
    const basicPlan = await this.findCurrentPlanByCode('basic');

    if (!basicPlan) {
      this.logger.error(
        `[downgradeToBasicPlan] No basic plan found for subscription ${subscription.subscription_id}`,
      );
      return;
    }

    // Update subscription to basic plan
    await this._prismaService.subscriptions.update({
      where: { subscription_id: subscription.subscription_id },
      data: {
        plan_id: basicPlan.id,
        plan_code: basicPlan.code,
        cancel_at_period_end: false, // Reset cancellation flag
        status: 'active', // Keep active but on basic plan
      },
    });

    // Log the downgrade event
    await this.logEvent(subscription.subscription_id, 'downgraded', {
      from_plan: subscription.plan_code,
      to_plan: basicPlan.code,
      reason: 'scheduled_cancellation_expired',
    });

    // Send downgrade notification
    if (subscription.users?.email) {
      await this._notificationService.sendEmail({
        to: subscription.users.email,
        subject: 'Your Subscription Has Been Downgraded',
        html: `
          <h2>Your subscription has been downgraded</h2>
          <p>Dear ${subscription.users.full_name || 'Customer'},</p>
          <p>As scheduled, your subscription has ended and been downgraded to the ${basicPlan.name} plan.</p>
          <p>You now have access to basic features. You can upgrade your plan at any time to regain full access.</p>
          <br>
          <p>Best regards,<br>Healthcare VisionAI Team</p>
        `,
      });
    }

    this.logger.log(
      `[downgradeToBasicPlan] Successfully downgraded subscription ${subscription.subscription_id} to ${basicPlan.code}`,
    );
  }

  async entitlements(userId: string) {
    const sub = await this.findActiveSubscription(userId);
    if (!sub) throw new Error('No active subscription found');
    const p = sub.plans;
    if (!p) throw new Error('No plan data in subscription');

    return {
      cameras: p.camera_quota + (sub.extra_camera_quota ?? 0),
      caregivers: p.caregiver_seats + (sub.extra_caregiver_seats ?? 0),
      sites: p.sites + (sub.extra_sites ?? 0),
      storageGB:
        Number((p.storage_size || '').match(/\d+/)?.[0] || 0) + (sub.extra_storage_gb ?? 0),
      retentionDays: p.retention_days,
    };
  }

  async getUserSubscriptions(userId: string) {
    return await this._prismaService.subscriptions.findMany({
      where: { user_id: userId },
      include: { plans: true },
      orderBy: { started_at: 'desc' },
    });
  }

  async getAllSubscriptions(options: PaginateOptions = {}) {
    const { page = 1, limit = 10, order = {}, where = {}, include } = options as any;

    const selectObj: any = {
      subscription_id: true,
      user_id: true,
      plan_code: true,
      status: true,
      billing_period: true,
      started_at: true,
      current_period_start: true,
      current_period_end: true,
      trial_end_at: true,
      canceled_at: true,
      ended_at: true,
      auto_renew: true,
      extra_camera_quota: true,
      extra_caregiver_seats: true,
      extra_sites: true,
      extra_storage_gb: true,
      notes: true,
      last_payment_at: true,
      cancel_at_period_end: true,
      version: true,
      offer_start_date: true,
      offer_end_date: true,
      renewal_attempt_count: true,
      next_renew_attempt_at: true,
      dunning_stage: true,
      last_renewal_error: true,
    };

    // Add plans relation if included
    const includePlans = Array.isArray(include) ? include.includes('plans') : true;
    if (includePlans) {
      selectObj.plans = {
        select: this.getPlanSelectFields(),
      };
    }

    const [subscriptions, total] = await Promise.all([
      this._prismaService.subscriptions.findMany({
        where,
        select: selectObj,
        orderBy: { started_at: 'desc', ...order },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this._prismaService.subscriptions.count({ where }),
    ]);

    let enrichedSubscriptions = subscriptions;
    if (includePlans && subscriptions.some((sub: any) => !sub.plans && sub.plan_code)) {
      const planCodes = subscriptions
        .filter((sub: any) => sub.plan_code && !sub.plans)
        .map((sub: any) => sub.plan_code);

      if (planCodes.length > 0) {
        const plans = await this._prismaService.plans.findMany({
          where: {
            code: { in: planCodes },
            is_current: true,
          },
          select: this.getPlanSelectFields(),
        });

        const planMap = new Map(plans.map((plan: any) => [plan.code, plan]));

        enrichedSubscriptions = subscriptions.map((sub: any) => ({
          ...sub,
          plans: sub.plans || planMap.get(sub.plan_code) || null,
        }));
      }
    }

    // Normalize relation name: map `plans` relation to `plan` for API consumers
    const normalized = enrichedSubscriptions.map((sub: any) => {
      const copy = { ...sub } as any;
      // attach `plan` as the single related plan object (or null)
      copy.plan = copy.plans ?? null;
      // remove internal/legacy relation key
      delete copy.plans;
      return this.convertBigIntToString(copy);
    });

    return {
      data: normalized,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  getMetricsSnapshot() {
    return this._subscriptionMetrics?.snapshot() ?? { expiredProcessed: 0, expiredFollowups: 0 };
  }

  /**
   * Tìm subscriptions cần gia hạn tự động
   */
  async findSubscriptionsToRenew(fromDate: Date, toDate: Date) {
    const subscriptions = await this._prismaService.subscriptions.findMany({
      where: {
        status: 'active',
        auto_renew: true,
        current_period_end: {
          gte: fromDate,
          lte: toDate,
        },
        users: { is: { default_payment_method_id: { not: null } } } as any,
      },
      include: {
        plans: true,
        users: true,
      },
    });

    for (const sub of subscriptions) {
      const ensuredPlan = await this.ensureSubscriptionDefaults(sub, sub.plans);
      if (ensuredPlan) {
        sub.plans = ensuredPlan;
        if (!sub.plan_id) {
          sub.plan_id = ensuredPlan.id;
        }
        if (!sub.billing_period || sub.billing_period === 'none') {
          sub.billing_period = ensuredPlan.billing_period || 'monthly';
        }
      } else if (!sub.billing_period || sub.billing_period === 'none') {
        sub.billing_period = 'monthly';
      }
    }

    return subscriptions;
  }

  /**
   * Gia hạn subscription với số ngày mới
   */
  async extendSubscriptionPeriod(subscriptionId: string, days: number) {
    const subscription = await this._prismaService.subscriptions.findUnique({
      where: { subscription_id: subscriptionId },
    });

    if (!subscription) {
      throw new Error(`Subscription ${subscriptionId} not found`);
    }

    if (!subscription.current_period_end) {
      throw new Error(`Subscription ${subscriptionId} has no current_period_end`);
    }

    const newPeriodEnd = new Date(subscription.current_period_end);
    newPeriodEnd.setDate(newPeriodEnd.getDate() + days);

    return await this._prismaService.subscriptions.update({
      where: { subscription_id: subscriptionId },
      data: {
        current_period_start: subscription.current_period_end,
        current_period_end: newPeriodEnd,
        last_payment_at: new Date(),
      },
    });
  }

  private async logEvent(id: string, ev: any, customEventData?: Record<string, any>) {
    // Gather eventData if available (e.g. payment, plan, etc.)
    let eventData: Record<string, any> | undefined = customEventData;
    // Use service-level idempotent helper (non-transactional)
    try {
      if (this._subscriptionEventsService) {
        await this._subscriptionEventsService.createEventIfNotExists({
          subscription_id: id,
          event_type: ev,
          byPaymentId: eventData?.paymentId,
          byTransactionId: eventData?.transactionId,
          event_data: eventData,
        });
      } else {
        this.logger.debug(
          '[logEvent] SubscriptionEventsService not available, skipping event creation',
        );
      }
    } catch (err) {
      this.logger.error(`[logEvent] Failed to create subscription event for ${id} ${ev}:`, err);
      // Continue without throwing — events are best-effort here
    }
  }

  /**
   * Áp dụng upgrade theo payment_id (được gọi từ IPN/Return).
   * Idempotent: nếu đã áp dụng cho tx_id này thì bỏ qua.
   */
  async applyUpgradeOnPaymentSuccessByPayment(paymentId: string) {
    const where: any = { OR: [{ payment_id: paymentId }, { provider_payment_id: paymentId }] };
    const tx = await this._prismaService.transactions.findFirst({ where: where as any });
    if (!tx) return { ok: false, reason: 'tx_not_found_for_payment' };
    return this.applyUpgradeOnPaymentSuccess(tx.tx_id);
  }

  /**
   * Handle payment success by delegating to appropriate sub-service based on transaction action
   */
  async handlePaymentSuccess(paymentId: string) {
    this.logger.log(`[handlePaymentSuccess] Handling payment success for payment ${paymentId}`);

    const tx = await this._prismaService.transactions.findFirst({
      where: {
        OR: [{ provider_payment_id: paymentId }, { payment_id: paymentId }],
      },
    });

    if (!tx) {
      this.logger.warn(
        `[handlePaymentSuccess] Transaction not found for payment ${paymentId}, attempting confirmPaid fallback...`,
      );
      // Fallback: try to confirm directly by payment record
      try {
        const payment = await this._paymentRepository.findByPaymentIdOrTxnRef({
          paymentId,
          vnpTxnRef: paymentId.replace(/-/g, ''),
          vnpTxnRefAlt: paymentId,
        });
        if (!payment) return { success: false, reason: 'payment_not_found' };
        if (!this.isPaymentPaid(payment)) return { success: false, reason: 'payment_not_paid' };
        const res = await this.confirmPaid(payment.user_id, paymentId);
        const ok = !!res && (res as any).status && (res as any).status !== 'error';
        return { success: ok, reason: ok ? 'confirmed_via_fallback' : 'confirm_failed' };
      } catch (err) {
        this.logger.error(
          `[handlePaymentSuccess] Fallback confirmPaid failed for payment ${paymentId}:`,
          err,
        );
        return { success: false, reason: 'fallback_confirm_failed' };
      }
    }

    if (!tx.payment_id) {
      try {
        await this._prismaService.transactions.update({
          where: { tx_id: tx.tx_id },
          data: { payment_id: paymentId },
        });
        (tx as any).payment_id = paymentId;
      } catch (err) {
        this.logger.warn(
          `[handlePaymentSuccess] Không thể gắn payment_id cho transaction ${tx.tx_id}: ${String(
            err instanceof Error ? err.message : err,
          )}`,
        );
      }
    }

    this.logger.log(
      `[handlePaymentSuccess] Found transaction ${tx.tx_id} with action ${tx.effective_action}`,
    );

    let success = false;
    let reason: string | undefined;
    let cleanupSubscriptionId: string | null = null;

    switch (tx.effective_action) {
      case 'upgrade': {
        const upgradeResult = await this.applyUpgradeOnPaymentSuccess(tx.tx_id);
        success = upgradeResult.ok;
        reason = upgradeResult.reason;
        cleanupSubscriptionId = success ? tx.subscription_id : null;
        break;
      }
      case 'downgrade': {
        const downgradeResult = await this.applyDowngradeOnPaymentSuccess(tx.tx_id);
        success = downgradeResult.ok;
        reason = downgradeResult.reason;
        cleanupSubscriptionId = success ? tx.subscription_id : null;
        break;
      }
      case 'renew': {
        const now = new Date();
        const sub = await this._prismaService.subscriptions.findFirst({
          where: { subscription_id: tx.subscription_id },
          include: { plans: true },
        });
        if (!sub) return { success: false, reason: 'subscription_not_found' };

        const paymentRecord = tx.payment_id
          ? await this._prismaService.payments.findUnique({
              where: { payment_id: tx.payment_id },
              select: { delivery_data: true },
            })
          : null;
        const paymentDelivery = (paymentRecord?.delivery_data as any) ?? {};
        const selectedBillingPeriod = this.resolveBillingPeriod(
          sub,
          sub.plans,
          paymentDelivery.billing_period as BillingPeriod | undefined,
        );
        const selectedBillingType =
          this.normalizeBillingType(paymentDelivery.billing_type) ?? PlanBillingType.PREPAID;
        const baseStartSource =
          sub.current_period_end && sub.current_period_end > now ? sub.current_period_end : now;
        const newPeriodStart = new Date(baseStartSource.getTime());
        const newPeriodEnd = this.addBillingPeriod(newPeriodStart, selectedBillingPeriod);

        let planId: string | null = sub.plan_id ?? null;
        if (!planId) {
          const plan = await this._prismaService.plans.findFirst({
            where: { code: tx.plan_code, is_current: true },
          });
          planId = plan?.id ?? null;
        }

        await this._prismaService.$transaction(async (prisma) => {
          await prisma.subscriptions.update({
            where: { subscription_id: sub.subscription_id },
            data: {
              last_payment_at: now,
              plan_id: planId ?? sub.plan_id,
              billing_period: selectedBillingPeriod,
              current_period_start: newPeriodStart,
              current_period_end: newPeriodEnd,
              cancel_at_period_end: false,
            },
          });
          await prisma.transactions.update({
            where: { tx_id: tx.tx_id },
            data: { status: 'paid' as any },
          });
          await this._subscriptionEventRepository.createIfNotExistsByEventDataInTransaction(
            prisma as any,
            sub.subscription_id,
            'renewed',
            'transactionId',
            tx.tx_id,
            {
              subscription_id: sub.subscription_id,
              event_type: 'renewed',
              event_data: {
                transactionId: tx.tx_id,
                plan: tx.plan_code,
                amount: tx.amount_total != null ? String(tx.amount_total) : null,
                billing_period: selectedBillingPeriod,
                billing_type: selectedBillingType,
              },
            } as any,
          );
        });

        success = true;
        cleanupSubscriptionId = sub.subscription_id;
        break;
      }
      default:
        this.logger.warn(
          `[handlePaymentSuccess] Unsupported transaction action: ${tx.effective_action}`,
        );
        return { success: false, reason: `unsupported_action_${tx.effective_action}` };
    }

    if (success && cleanupSubscriptionId) {
      await this.clearAutoExpiredState(cleanupSubscriptionId);
    }

    return { success, reason };
  }

  /**
   * Áp dụng upgrade theo tx_id. Chỉ chạy khi payment đã succeeded.
   * - Giữ nguyên billing anchor (period_end cũ)
   * - Đổi plan + entitlements atomically
   * - Idempotent bằng cách tra event theo transactionId
   */
  async applyUpgradeOnPaymentSuccess(txId: string) {
    this.logger.log(
      `[applyUpgradeOnPaymentSuccess] Delegating to SubscriptionUpgradeService for transaction ${txId}`,
    );

    return this._subscriptionUpgradeService.applyUpgradeOnPaymentSuccess(txId);
  }

  async applyDowngradeOnPaymentSuccess(txId: string) {
    this.logger.log(
      `[applyDowngradeOnPaymentSuccess] Delegating to SubscriptionDowngradeService for transaction ${txId}`,
    );

    // Get transaction details to extract required parameters
    const tx = await this._transactionRepository.findByTxId(txId, {
      subscriptions: true,
    } as any);

    if (!tx) {
      return { ok: false, reason: 'tx_not_found' };
    }

    const subscriptionId = tx.subscription_id;
    const newPlanCode = ((tx as any).plan_snapshot_new as any)?.code || tx.plan_code;

    const result = this._subscriptionDowngradeService.applyDowngradeOnPaymentSuccess(
      subscriptionId,
      newPlanCode,
      txId,
    );

    // Convert DowngradeResult to the expected format
    const downgradeResult = await result;
    return {
      ok: downgradeResult.status === 'success',
      reason:
        downgradeResult.reason ||
        (downgradeResult.status === 'success' ? undefined : downgradeResult.status),
    };
  }

  /**
   * Cron job: Apply scheduled downgrades at period end
   */
  @Cron('0 */6 * * *', { timeZone: 'Asia/Ho_Chi_Minh' }) // Every 6 hours
  async applyScheduledDowngrades() {
    this.logger.log('[applyScheduledDowngrades] Starting scheduled downgrade check');

    const now = new Date();

    // Find transactions that are scheduled for downgrade and ready to apply
    const scheduledDowngrades = await this._prismaService.transactions.findMany({
      where: {
        effective_action: 'downgrade',
        status: 'paid' as any, // zero-amount "payment" already "processed"
        period_start: { lte: now }, // time to apply
        subscriptions: {
          status: 'active', // still active
          cancel_at_period_end: true, // was canceled at period end
        },
      },
      include: {
        subscriptions: true,
      },
    });

    for (const tx of scheduledDowngrades) {
      try {
        await this._prismaService.$transaction(async (prisma) => {
          // Update subscription to Basic
          await prisma.subscriptions.update({
            where: { subscription_id: tx.subscription_id },
            data: {
              plan_code: tx.plan_code,
              plan_id: tx.plan_id,
              status: 'active', // keep active but on Basic
              cancel_at_period_end: false, // reset flag
              canceled_at: null, // clear cancel timestamp
              notes: this.stripAutoExpiredNote(tx.subscriptions?.notes ?? null),
            },
          });

          // Log the downgrade event idempotently inside transaction
          await this._subscriptionEventRepository.createIfNotExistsByEventDataInTransaction(
            prisma as any,
            tx.subscription_id,
            'downgraded',
            'transactionId',
            tx.tx_id,
            {
              subscription_id: tx.subscription_id,
              event_type: 'downgraded',
              event_data: {
                transactionId: tx.tx_id,
                oldPlan: tx.subscriptions?.plan_code,
                newPlan: tx.plan_code,
                scheduled: true,
                appliedAt: now.toISOString(),
              },
            } as any,
          );

          // Mark transaction as applied
          await prisma.transactions.update({
            where: { tx_id: tx.tx_id },
            data: {
              status: 'applied' as any,
              notes: `${tx.notes} - Applied at ${now.toISOString()}`,
            },
          });
        });

        this.logger.log(
          `[applyScheduledDowngrades] Applied downgrade to ${tx.plan_code} for subscription ${tx.subscription_id}`,
        );
      } catch (error) {
        this.logger.error(
          `[applyScheduledDowngrades] Failed to apply downgrade for subscription ${tx.subscription_id}:`,
          error,
        );
      }
    }
  }

  /**
   * Cron job: detect subscriptions past their current_period_end without auto-renew
   * and automatically queue a downgrade to the basic plan.
   */
  @Cron('0 * * * *', { timeZone: 'Asia/Ho_Chi_Minh' }) // Hourly
  async processExpiredSubscriptions() {
    const now = new Date();
    this.logger.debug('[processExpiredSubscriptions] Checking for expired subscriptions');

    const expiredSubs = await this._prismaService.subscriptions.findMany({
      where: {
        status: { in: ['active', 'past_due'] },
        auto_renew: false,
        cancel_at_period_end: false,
        current_period_end: { lt: now },
      },
      include: {
        plans: true,
        users: {
          select: {
            email: true,
            full_name: true,
          },
        },
      },
    });

    if (!expiredSubs.length) {
      this.logger.debug('[processExpiredSubscriptions] No expired subscriptions found');
      return;
    }

    const targetPlanCode = 'basic';

    for (const sub of expiredSubs) {
      try {
        const currentPlanCode = (sub.plan_code || '').toLowerCase();
        const expiryKey = `auto_expired:${sub.subscription_id}:${targetPlanCode}`;
        const existingExpiredEvent = await this._subscriptionEventRepository.findByEventDataPath(
          sub.subscription_id,
          'expired' as any,
          'expiryKey',
          expiryKey,
        );

        let scheduledDowngradeAt: string | null = null;
        const autoNoteMarker = `auto_expired:${now.toISOString()}`;
        const baseNote = this.stripAutoExpiredNote(sub.notes);
        const newNotesRaw = [baseNote, autoNoteMarker].filter(Boolean).join('\n');
        const newNotes = newNotesRaw.length ? newNotesRaw : null;

        if (currentPlanCode !== targetPlanCode) {
          const baseMillis = sub.current_period_end
            ? sub.current_period_end.getTime()
            : now.getTime();
          const effectiveAtMillis = Math.max(now.getTime() + 5 * 60 * 1000, baseMillis);
          const effectiveAt = new Date(effectiveAtMillis);

          const idempotencyKey = `expired_auto:${sub.subscription_id}:${targetPlanCode}`;

          const result = await this.scheduleDowngrade({
            userId: sub.user_id,
            subscriptionId: sub.subscription_id,
            plan_code: targetPlanCode,
            effectiveAt,
            idempotencyKey,
          });

          if (result.scheduled || result.reason === 'already_scheduled') {
            scheduledDowngradeAt = effectiveAt.toISOString();
          } else {
            this.logger.warn(
              `[processExpiredSubscriptions] Unable to schedule downgrade for ${sub.subscription_id}: ${result.reason || 'unknown_reason'}`,
            );
          }
        }

        await this._prismaService.subscriptions.update({
          where: { subscription_id: sub.subscription_id },
          data: {
            status: 'expired',
            cancel_at_period_end: true,
            canceled_at: sub.canceled_at ?? now,
            notes: newNotes,
          },
        });

        if (this._eventEmitter) {
          try {
            await safeEmitAsync(this._eventEmitter, 'subscription.expired', [
              {
                subscriptionId: sub.subscription_id,
                userId: sub.user_id,
                previousPlan: currentPlanCode || null,
                targetPlan: targetPlanCode,
                scheduledDowngradeAt,
              },
            ]);
          } catch (err) {
            this.logger.warn(
              `[processExpiredSubscriptions] Failed to emit subscription.expired for ${sub.subscription_id}: ${String(
                err instanceof Error ? err.message : err,
              )}`,
            );
          }
        }

        await this._subscriptionEventRepository.createIfNotExistsByEventData(
          sub.subscription_id,
          'expired' as any,
          'expiryKey',
          expiryKey,
          {
            subscription_id: sub.subscription_id,
            event_type: 'expired',
            event_data: {
              expiryKey,
              expiredAt: now.toISOString(),
              previousPlan: currentPlanCode || null,
              targetPlan: targetPlanCode,
              scheduledDowngradeAt,
              autoCancel: true,
            },
            created_at: now,
          } as any,
        );

        if (!existingExpiredEvent && sub.users?.email) {
          const userName = sub.users.full_name || 'bạn';
          const downgradeMessage = scheduledDowngradeAt
            ? `Tài khoản sẽ được chuyển về gói Basic vào ${new Date(
                scheduledDowngradeAt,
              ).toLocaleString('vi-VN', {
                timeZone: 'Asia/Ho_Chi_Minh',
              })}.`
            : 'Tài khoản hiện đã quay về gói Basic và không còn quyền lợi của gói trả phí.';

          const planLabel = sub.plans?.name || sub.plan_code || 'hiện tại';

          const html = `
            <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #333;">
              <h2 style="color: #d32f2f;">Gói dịch vụ của bạn đã hết hạn</h2>
              <p>Xin chào ${userName},</p>
              <p>Gói <strong>${planLabel}</strong> của bạn đã hết hạn vào ${now.toLocaleString(
                'vi-VN',
                {
                  timeZone: 'Asia/Ho_Chi_Minh',
                },
              )}.</p>
              <p>${downgradeMessage}</p>
              <p>Nếu bạn muốn tiếp tục sử dụng đầy đủ quyền lợi, vui lòng gia hạn hoặc nâng cấp lại gói dịch vụ trong ứng dụng.</p>
              <p style="margin-top: 24px;">Trân trọng,<br/>Healthcare VisionAI</p>
            </div>
          `;

          const text = `Xin chào ${userName}, gói ${planLabel} của bạn đã hết hạn vào ${now.toLocaleString(
            'vi-VN',
            { timeZone: 'Asia/Ho_Chi_Minh' },
          )}. ${downgradeMessage} Vui lòng gia hạn để tiếp tục sử dụng.`;

          await this._notificationService.sendEmail({
            to: sub.users.email,
            subject: 'Gói dịch vụ đã hết hạn',
            html,
            text,
          });
        }
      } catch (err) {
        this.logger.error(
          `[processExpiredSubscriptions] Failed to handle subscription ${sub.subscription_id}:`,
          err,
        );
      }
    }

    this.logger.log(
      `[processExpiredSubscriptions] Processed ${expiredSubs.length} expired subscription(s)`,
    );
    if (this._subscriptionMetrics && expiredSubs.length > 0) {
      this._subscriptionMetrics.incrementExpiredProcessed(expiredSubs.length);
    }
  }

  @Cron('30 9 * * *', { timeZone: 'Asia/Ho_Chi_Minh' }) // Daily follow-up at 9:30 AM
  async processExpiredReminders() {
    const now = new Date();
    const reminderThreshold = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    const expiredEvents = await this._prismaService.subscription_histories.findMany({
      where: {
        event_type: 'expired',
        created_at: { lte: reminderThreshold } as any,
      },
      include: {
        subscription: {
          include: {
            users: {
              select: {
                email: true,
                full_name: true,
                phone_number: true,
              },
            },
            plans: true,
          },
        },
      },
      orderBy: { created_at: 'asc' },
    });

    if (!expiredEvents.length) {
      this.logger.debug('[processExpiredReminders] No expired subscriptions pending follow-up');
      return;
    }

    let followupsSent = 0;

    for (const event of expiredEvents) {
      const sub = event.subscription;
      if (!sub || sub.status !== 'expired') continue;

      const eventData = (event.event_data ?? {}) as Record<string, any>;
      const expiryKey =
        typeof eventData?.expiryKey === 'string'
          ? eventData.expiryKey
          : `auto_expired:${sub.subscription_id}:basic`;
      const followupKey = `${expiryKey}:followup`;

      const followupExists = await this._subscriptionEventRepository.findByEventDataPath(
        sub.subscription_id,
        'expired' as any,
        'followupKey',
        followupKey,
      );
      if (followupExists) continue;

      const planLabel = sub.plans?.name || sub.plan_code || 'dịch vụ';
      const userName = sub.users?.full_name || 'bạn';
      const scheduledDowngradeAt = eventData?.scheduledDowngradeAt;

      const emailMessage = scheduledDowngradeAt
        ? `Tài khoản của bạn sẽ được chuyển về gói Basic vào ${new Date(
            scheduledDowngradeAt,
          ).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}.`
        : 'Tài khoản của bạn hiện đang ở gói Basic với quyền lợi hạn chế.';

      if (sub.users?.email) {
        await this._notificationService.sendEmail({
          to: sub.users.email,
          subject: 'Gói dịch vụ vẫn đang tạm dừng',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #333;">
              <h2>Nhắc lại: gói ${planLabel} của bạn đã hết hạn</h2>
              <p>Xin chào ${userName},</p>
              <p>Chúng tôi nhận thấy gói <strong>${planLabel}</strong> của bạn đã hết hạn được vài ngày nhưng chưa được gia hạn.</p>
              <p>${emailMessage}</p>
              <p>Hãy gia hạn ngay hôm nay để tiếp tục sử dụng đầy đủ các tính năng nâng cao.</p>
              <p style="margin-top: 24px;">Trân trọng,<br/>Healthcare VisionAI</p>
            </div>
          `,
          text: `Xin chào ${userName}, gói ${planLabel} của bạn đã hết hạn và vẫn chưa được gia hạn. ${emailMessage} Hãy gia hạn để tiếp tục sử dụng dịch vụ.`,
        });
      }

      if (sub.users?.phone_number) {
        await this._notificationService.sendSMS({
          to: sub.users.phone_number,
          message: `Gói ${planLabel} của bạn đã hết hạn và vẫn chưa gia hạn. ${emailMessage} Vui lòng gia hạn để tiếp tục sử dụng dịch vụ.`,
        });
      }

      try {
        if (this._paymentService?.retryFailedPayment) {
          const lastFailedPayment = await this._prismaService.payments.findFirst({
            where: { user_id: sub.user_id, status: 'failed' },
            orderBy: { created_at: 'desc' },
          });
          if (lastFailedPayment) {
            await this._paymentService.retryFailedPayment(lastFailedPayment.payment_id);
          }
        }
      } catch (err) {
        this.logger.warn(
          `[processExpiredReminders] Retry payment failed for user ${sub.user_id}: ${String(
            err instanceof Error ? err.message : err,
          )}`,
        );
      }

      await this._subscriptionEventRepository.createIfNotExistsByEventData(
        sub.subscription_id,
        'expired' as any,
        'followupKey',
        followupKey,
        {
          subscription_id: sub.subscription_id,
          event_type: 'expired',
          event_data: {
            expiryKey,
            followupKey,
            followupAt: now.toISOString(),
            scheduledDowngradeAt,
          },
          created_at: now,
        } as any,
      );

      if (this._eventEmitter) {
        try {
          await safeEmitAsync(this._eventEmitter, 'subscription.expired.followup', [
            {
              subscriptionId: sub.subscription_id,
              userId: sub.user_id,
              expiryKey,
            },
          ]);
        } catch (err) {
          this.logger.warn(
            `[processExpiredReminders] Failed to emit subscription.expired.followup for ${sub.subscription_id}: ${String(
              err instanceof Error ? err.message : err,
            )}`,
          );
        }
      }

      followupsSent += 1;
    }

    if (followupsSent > 0) {
      this.logger.log(
        `[processExpiredReminders] Sent follow-up reminders for ${followupsSent} subscription(s)`,
      );
      if (this._subscriptionMetrics) {
        this._subscriptionMetrics.incrementExpiredFollowups(followupsSent);
      }
    } else {
      this.logger.debug('[processExpiredReminders] No follow-up reminders required');
    }
  }

  // ========== SUBSCRIPTION ANALYTICS METHODS ==========

  async getSubscriptionStats(options: { period?: string }) {
    const { period = 'month' } = options;

    // Calculate date range
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const [
      totalSubscriptions,
      activeSubscriptions,
      trialSubscriptions,
      cancelledSubscriptions,
      planBreakdown,
    ] = await Promise.all([
      this._prismaService.subscriptions.count(),
      this._prismaService.subscriptions.count({ where: { status: 'active' } }),
      this._prismaService.subscriptions.count({ where: { status: 'trialing' } }),
      this._prismaService.subscriptions.count({ where: { status: 'canceled' } }),
      this._prismaService.subscriptions.groupBy({
        by: ['plan_code'],
        _count: { _all: true },
        where: { status: 'active' },
      }),
    ]);

    const planStats = planBreakdown.reduce(
      (acc, item) => {
        acc[item.plan_code] = item._count._all;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      total_subscriptions: totalSubscriptions,
      active_subscriptions: activeSubscriptions,
      trial_subscriptions: trialSubscriptions,
      cancelled_subscriptions: cancelledSubscriptions,
      churn_rate: totalSubscriptions > 0 ? (cancelledSubscriptions / totalSubscriptions) * 100 : 0,
      plan_breakdown: planStats,
      period: {
        from: startDate.toISOString(),
        to: now.toISOString(),
      },
    };
  }

  async getChurnAnalysis(options: { period?: string }) {
    const { period = 'month' } = options;

    // Calculate date range
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const cancelledInPeriod = await this._prismaService.subscriptions.count({
      where: {
        status: 'canceled',
        canceled_at: {
          gte: startDate,
          lte: now,
        },
      },
    });

    const activeAtStart = await this._prismaService.subscriptions.count({
      where: {
        OR: [
          { status: 'active' },
          {
            status: 'canceled',
            canceled_at: {
              gte: startDate,
            },
          },
        ],
        started_at: {
          lte: startDate,
        },
      },
    });

    const churnRate = activeAtStart > 0 ? (cancelledInPeriod / activeAtStart) * 100 : 0;

    return {
      churn_rate: churnRate,
      cancelled_in_period: cancelledInPeriod,
      active_at_period_start: activeAtStart,
      period: {
        from: startDate.toISOString(),
        to: now.toISOString(),
      },
    };
  }

  // ========== SUBSCRIPTION LIFECYCLE METHODS ==========

  async getExpiringSubscriptions(options: { days?: number; page?: number; limit?: number }) {
    const { days = 7, page = 1, limit = 20 } = options;
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + days);

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this._prismaService.subscriptions.findMany({
        where: {
          status: 'active',
          current_period_end: {
            lte: expirationDate,
            gte: new Date(),
          },
        },
        include: {
          users: {
            select: {
              user_id: true,
              email: true,
              full_name: true,
            },
          },
          plans: true,
        },
        skip,
        take: limit,
        orderBy: { current_period_end: 'asc' },
      }),
      this._prismaService.subscriptions.count({
        where: {
          status: 'active',
          current_period_end: {
            lte: expirationDate,
            gte: new Date(),
          },
        },
      }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async reactivateSubscription(
    subscriptionId: string,
    options: { reason?: string; notes?: string },
  ) {
    const subscription = await this._subscriptionRepository.findBySubscriptionId(subscriptionId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    if (subscription.status !== 'canceled') {
      throw new Error('Subscription is not canceled');
    }

    // Reactivate subscription
    await this._prismaService.subscriptions.update({
      where: { subscription_id: subscriptionId },
      data: {
        status: 'active',
        canceled_at: null,
      },
    });

    // Log reactivation event
    await this._subscriptionEventRepository.create({
      ...({
        subscription_id: subscriptionId,
        event_type: 'activated',
        event_data: { reason: options.reason, notes: options.notes },
      } as any),
    });

    return { success: true, message: 'Subscription reactivated successfully' };
  }

  async changePlan(
    subscriptionId: string,
    options: { plan_code: string; reason?: string; notes?: string },
  ) {
    const subscription = await this._subscriptionRepository.findBySubscriptionId(subscriptionId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const newPlan = await this._planRepository.findByCode(options.plan_code);
    if (!newPlan) {
      throw new Error('Plan not found');
    }

    // Update subscription plan
    await this._prismaService.subscriptions.update({
      where: { subscription_id: subscriptionId },
      data: {
        plan_code: options.plan_code,
      },
    });

    // Log plan change event
    await this._subscriptionEventRepository.create({
      ...({
        subscription_id: subscriptionId,
        event_type: 'upgraded',
        event_data: {
          old_plan: subscription.plan_code,
          new_plan: options.plan_code,
          reason: options.reason,
          notes: options.notes,
        },
      } as any),
    });

    return { success: true, message: 'Plan changed successfully' };
  }

  async getLifecycleEvents(options: {
    subscription_id?: string;
    event_type?: string;
    page?: number;
    limit?: number;
  }) {
    const { subscription_id, event_type, page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (subscription_id) where.subscription_id = subscription_id;
    if (event_type) where.event_type = event_type;

    const [items, total] = await Promise.all([
      this._prismaService.subscription_histories.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      this._prismaService.subscription_histories.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ========== BULK OPERATIONS METHODS ==========

  async bulkAction(options: {
    action: 'pause' | 'resume' | 'cancel';
    subscription_ids: string[];
    reason?: string;
    notes?: string;
  }) {
    const { action, subscription_ids, reason, notes } = options;

    const results = [];
    const errors = [];

    for (const subscriptionId of subscription_ids) {
      try {
        let result;
        switch (action) {
          case 'pause':
            result = await this.pauseBySubscriptionId(subscriptionId, reason);
            break;
          case 'resume':
            result = await this.resumeBySubscriptionId(subscriptionId);
            break;
          case 'cancel':
            result = await this.cancelBySubscriptionId(subscriptionId);
            break;
          default:
            throw new Error(`Unknown action: ${action}`);
        }

        results.push({
          subscription_id: subscriptionId,
          success: true,
          result,
        });
      } catch (error) {
        errors.push({
          subscription_id: subscriptionId,
          success: false,
          error: (error as Error).message,
        });
      }
    }

    return {
      action,
      total_requested: subscription_ids.length,
      successful: results.length,
      failed: errors.length,
      results,
      errors,
      summary: {
        reason,
        notes,
        processed_at: new Date().toISOString(),
      },
    };
  }

  async suspend(userId: string, reason?: string) {
    this.logger.log(`[suspend] Bắt đầu tạm ngừng subscription cho user ${userId}`);

    const sub = await this.getActive(userId);
    if (!sub) {
      this.logger.warn(`[suspend] User ${userId} không có subscription để tạm ngừng`);
      return null;
    }

    this.logger.debug(
      `[suspend] Tạm ngừng subscription ${sub.subscription_id} từ status ${sub.status}`,
    );

    const updatedSub = await this._prismaService.subscriptions.update({
      where: { subscription_id: sub.subscription_id },
      data: {
        status: 'suspended',
        notes: reason || sub.notes,
      },
      include: { plans: true },
    });

    await this.logEvent(updatedSub.subscription_id, 'suspended');

    this.logger.log(
      `[suspend] Đã tạm ngừng subscription ${updatedSub.subscription_id} thành công cho user ${userId}`,
    );
    return updatedSub;
  }

  async migrateDeprecatedPlans() {
    this.logger.log(`[migrateDeprecatedPlans] Bắt đầu kiểm tra và migrate deprecated plans`);

    const deprecatedPlans = await this._prismaService.plans.findMany({
      where: {
        status: 'deprecated',
        successor_plan_code: { not: null },
        successor_plan_version: { not: null },
      },
      include: {
        subscriptions: {
          where: {
            status: { in: ['active', 'trialing', 'past_due', 'paused'] },
          },
        },
      },
    });

    this.logger.debug(
      `[migrateDeprecatedPlans] Tìm thấy ${deprecatedPlans.length} deprecated plans cần migrate`,
    );

    for (const plan of deprecatedPlans) {
      if (!plan.successor_plan_code || !plan.successor_plan_version) continue;

      this.logger.log(
        `[migrateDeprecatedPlans] Migrate plan ${plan.code} v${plan.version} -> ${plan.successor_plan_code} v${plan.successor_plan_version}`,
      );

      // Tìm successor plan
      const successorPlan = await this._prismaService.plans.findFirst({
        where: {
          code: plan.successor_plan_code,
          version: plan.successor_plan_version,
          is_current: true,
        },
      });

      if (!successorPlan) {
        this.logger.warn(
          `[migrateDeprecatedPlans] Successor plan ${plan.successor_plan_code} v${plan.successor_plan_version} không tìm thấy`,
        );
        continue;
      }

      // Migrate subscriptions
      for (const subscription of plan.subscriptions) {
        try {
          await this._prismaService.subscriptions.update({
            where: { subscription_id: subscription.subscription_id },
            data: {
              plan_id: successorPlan.id,
              plan_code: successorPlan.code,
            },
          });

          await this.logEvent(subscription.subscription_id, 'plan_migrated', {
            from_plan: `${plan.code} v${plan.version}`,
            to_plan: `${successorPlan.code} v${successorPlan.version}`,
          });

          this.logger.log(
            `[migrateDeprecatedPlans] Đã migrate subscription ${subscription.subscription_id} từ ${plan.code} sang ${successorPlan.code}`,
          );
        } catch (error) {
          this.logger.error(
            `[migrateDeprecatedPlans] Lỗi khi migrate subscription ${subscription.subscription_id}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }
    }

    this.logger.log(`[migrateDeprecatedPlans] Hoàn thành migrate deprecated plans`);
  }

  /**
   * Schedule downgrade to Basic plan at period end (no refund)
   */
  private async scheduleDowngradeToBasicAtPeriodEnd(prisma: any, subscription: any) {
    const basicPlan = await this.findCurrentPlanByCode('basic');
    if (!basicPlan) throw new Error('Basic plan not found');

    await prisma.transactions.create({
      data: {
        subscription_id: subscription.subscription_id,
        plan_code: basicPlan.code,
        plan_id: basicPlan.id,
        plan_snapshot: subscription.plans ?? {},
        plan_snapshot_new: { code: basicPlan.code, id: basicPlan.id, version: basicPlan.version },
        amount_subtotal: 0n,
        amount_total: 0n,
        currency: 'VND',
        period_start: subscription.current_period_end!, // hiệu lực ngay lúc rollover
        period_end: subscription.current_period_end!,
        // Use draft for scheduled zero-amount transactions so they don't appear as successful payments
        status: 'draft' as any,
        effective_action: 'downgrade',
        provider: 'manual',
        is_proration: false,
        proration_charge: 0n,
        proration_credit: 0n,
        notes: 'Scheduled downgrade to Basic at period end (no refund)',
      },
    });

    this.logger.log(
      `[scheduleDowngradeToBasicAtPeriodEnd] Scheduled downgrade to Basic for subscription ${subscription.subscription_id} at ${subscription.current_period_end}`,
    );
  }

  /**
   * Cron job: Send renewal reminders for auto-renew subscriptions
   */
  @Cron('0 9 * * *', { timeZone: 'Asia/Ho_Chi_Minh' }) // 9 AM daily
  async sendRenewalReminders() {
    this.logger.log('[sendRenewalReminders] Starting renewal reminder check');

    const now = new Date();
    let totalReminders = 0;

    // Send reminders for 7, 3, and 1 day before renewal
    for (const days of [7, 3, 1]) {
      const start = new Date(now);
      start.setDate(start.getDate() + days);
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

      const subs = await this._prismaService.subscriptions.findMany({
        where: {
          status: 'active',
          auto_renew: true,
          cancel_at_period_end: false,
          current_period_end: { gte: start, lt: end },
        },
        include: { users: true, plans: true },
      });

      for (const s of subs) {
        try {
          // Create alert
          // Create in-app notification (merged alert -> notifications)
          await this._prismaService.notifications.create({
            data: {
              event_id: s.subscription_id,
              user_id: s.user_id,
              business_type: 'system_update',
              channel: 'in_app',
              title: `Thông báo gia hạn gói`,
              message: `Gói "${s.plans?.name ?? s.plan_code}" sẽ tự gia hạn sau ${days} ngày.`,
              delivery_data: { plan_code: s.plans?.code ?? s.plan_code, days },
              status: 'pending',
            },
          });

          totalReminders++;
        } catch (error) {
          this.logger.error(
            `[sendRenewalReminders] Failed to send reminder for subscription ${s.subscription_id}:`,
            error,
          );
        }
      }
    }

    this.logger.log(`[sendRenewalReminders] Completed, sent ${totalReminders} reminders`);
  }

  /**
   * Admin: Tạo manual refund cho case đặc biệt (thu trùng, lỗi hệ thống)
   */
  async createManualRefund(dto: {
    userId: string;
    amount: number;
    reason: string;
    notes?: string;
    originalTransactionId?: string;
    adminUserId: string;
  }) {
    this.logger.log(
      `[createManualRefund] Admin ${dto.adminUserId} tạo manual refund cho user ${dto.userId}, amount: ${dto.amount}`,
    );

    return this._prismaService.$transaction(async (prisma) => {
      // Tìm subscription active của user
      const subscription = await this.getActive(dto.userId);
      if (!subscription) {
        throw new Error('User không có subscription active');
      }

      // Tạo refund transaction
      const refundTx = await prisma.transactions.create({
        data: {
          subscription_id: subscription.subscription_id,
          plan_code: subscription.plan_code,
          plan_snapshot: subscription.plans || {},
          amount_subtotal: BigInt(-dto.amount),
          amount_total: BigInt(-dto.amount),
          currency: 'VND',
          period_start: subscription.current_period_start,
          period_end: subscription.current_period_end,
          effective_action: 'adjustment', // Manual refund
          status: 'paid' as any, // Manual refund considered paid
          provider: 'manual',
          related_tx_id: dto.originalTransactionId,
          notes: `[MANUAL REFUND] ${dto.reason}${dto.notes ? ` - ${dto.notes}` : ''} | Admin: ${dto.adminUserId}`,
        },
      });

      // Log event
      await this.logEvent(subscription.subscription_id, 'refunded', {
        type: 'manual',
        amount: dto.amount,
        reason: dto.reason,
        admin_user_id: dto.adminUserId,
        transaction_id: refundTx.tx_id,
      });

      this.logger.log(
        `[createManualRefund] Manual refund created: ${refundTx.tx_id} for user ${dto.userId}`,
      );

      return refundTx;
    });
  }
}
