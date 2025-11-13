import { formatIsoLocal } from '@/shared/dates/iso-local';
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { payment_status_enum } from '@prisma/client';
import type { VerifyIpnCall, VerifyReturnUrl } from 'vnpay';
import { ProductCode, VNPay, VnpLocale, dateFormat } from 'vnpay';
import PlanBillingType from '../../../core/types/plan-billing.types';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PaymentRepository } from '../../../infrastructure/repositories/payments/payment.repository';
import { SubscriptionEventRepository } from '../../../infrastructure/repositories/payments/subscription-event.repository';
import { VNPAY_CLIENT } from '../../../shared/providers/vnpay.provider';
import { roundMajor, toMajor, toMinor } from '../../../shared/utils/money.util';
import { getPriceForPeriod, prorateMinor } from '../../../shared/utils/proration.util';
import { buildVnpSignedQuery } from '../../../shared/utils/vnpay-sign.util';
import { CreatePaymentDto } from '../../dto/payment/payment.dto';
import { CacheService } from '../cache.service';
import { PaymentEventService } from './payment-event.service';

type BillingPeriod = 'monthly' | 'none';

// Khi buildPaymentUrl với lib 'vnpay': truyền amount ở **major VND**
// vnp_Amount: payment.amount  // OK: lib tự ×100

// Kiểm tra bằng nhau:
function equalsVnpAmount(vnpAmountRaw: any, amountVnd: number) {
  // VNPay may return amount in different shapes depending on lib/version:
  // - sometimes vnp_Amount comes as minor units (e.g. 29900000)
  // - sometimes the verification lib returns the value divided by 100 (e.g. 299000)
  const vnpVal = Number(vnpAmountRaw);
  if (!Number.isFinite(vnpVal)) return false;

  const expectMinor = toMinor(amountVnd); // e.g. 299000 * 100 = 29900000

  // Accept either exact match on minor units or match on major units
  if (vnpVal === Number(expectMinor)) return true;
  if (vnpVal === Number(amountVnd)) return true; // sometimes already in major units

  // Some libs return majorUnits/100 (i.e. amount/100) — check that possibility
  if (vnpVal === Math.round(Number(amountVnd) / 100)) return true;

  return false;
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  private readonly STATUS_MAP: Record<string, payment_status_enum> = {
    pending: 'pending',
    processing: 'processing',
    paid: 'completed',
    completed: 'completed',
    failed: 'failed',
    canceled: 'cancelled',
    cancelled: 'cancelled',
  } as const;

  constructor(
    private readonly _paymentRepository: PaymentRepository,
    @Inject(VNPAY_CLIENT) private readonly _vnpay: VNPay,
    private readonly _config: ConfigService,
    private readonly _cacheService: CacheService,
    private readonly _prismaService: PrismaService,
    private readonly _paymentEventService: PaymentEventService,
    @Optional() private readonly _subscriptionEventRepository?: SubscriptionEventRepository,
  ) {}

  private buildVnpayPaymentUrl(params: Record<string, any>): string {
    let host = this._config.get<string>('VNP_HOST');
    // If the configured host is not a fully-qualified URL, fall back to sandbox
    if (!host || !/^https?:\/\//i.test(host)) {
      host = 'https://sandbox.vnpayment.vn';
    }
    const endpoint = this._config.get<string>('VNP_PAYMENT_ENDPOINT') ?? 'paymentv2/vpcpay.html';
    const secret = this._config.getOrThrow<string>('VNP_HASH_SECRET');

    this.logger.debug(
      `[VNPay] Secret length: ${secret.length}, trimmed length: ${secret.trim().length}`,
    );

    const encodingCfg = (this._config.get<string>('VNP_ENCODING') || 'form') as 'form' | 'rfc3986';
    // Always include the SecureHashType per VNPay examples for webpay
    const { canonical, hash, query } = buildVnpSignedQuery(params, secret, {
      encoding: encodingCfg,
      includeSecureHashType: true,
    });

    this.logger.debug(`[VNPay] canonicalString: ${canonical}`);
    this.logger.debug(`[VNPay] secureHash: ${hash}`);
    const signedAt = formatIsoLocal(new Date());
    this.logger.debug(`[VNPay] signedAt: ${signedAt}`);
    this.logger.debug(`[VNPay] query: ${query}`);

    // Build URL by concatenation to avoid URL.search re-encoding '+' into '%2B'
    const hostClean = host.replace(/\/$/, '');
    const endpointClean = endpoint.replace(/^\//, '');
    return `${hostClean}/${endpointClean}?${query}`;
  }

  /**
   * Create a postpaid invoice transaction (unpaid) inside an existing prisma transaction
   */
  private async createPostpaidInvoiceInTransaction(
    prisma: any,
    subscription: any,
    plan: any,
    renewalAmount: number,
    periodEnd: Date,
  ) {
    const invoiceTx = await prisma.transactions.create({
      data: {
        subscription_id: subscription.subscription_id,
        plan_code: plan.code,
        plan_id: plan.id,
        plan_snapshot: this.convertBigIntToString(plan),
        plan_snapshot_new: this.convertBigIntToString(plan),
        amount_subtotal: toMinor(renewalAmount),
        amount_total: toMinor(renewalAmount),
        currency: 'VND',
        period_start: subscription.current_period_start,
        period_end: periodEnd,
        // For invoices we set status to 'unpaid' so downstream invoice processing can act on it
        status: 'unpaid',
        effective_action: 'invoice',
        provider: 'invoice',
        is_proration: false,
        proration_charge: 0n,
        proration_credit: 0n,
        notes: `Postpaid invoice created for period ending ${periodEnd.toISOString()}`,
      },
    });

    return invoiceTx;
  }

  getVnpSecret(): string {
    return this._config.getOrThrow<string>('VNP_HASH_SECRET');
  }

  private normalizePlanSnapshot(plan: any) {
    if (!plan) return null;
    const clone: Record<string, any> = {};
    for (const key of Object.keys(plan)) {
      const value = (plan as any)[key];
      clone[key] = typeof value === 'bigint' ? value.toString() : value;
    }
    return clone;
  }

  /** Ensure delivery_data has a consistent shape */
  private ensureDeliveryData(payload: any) {
    if (!payload) return { plan_code: null };
    try {
      if (typeof payload === 'string') return { plan_code: payload };
      if (typeof payload === 'object') return { plan_code: (payload.plan_code as any) ?? null };
    } catch {
      return { plan_code: null };
    }
    return { plan_code: null };
  }

  private extractPlanCode(payment: any): string | null {
    if (!payment) return null;
    if (payment.plan_code) return payment.plan_code;
    try {
      return (payment.delivery_data as any)?.plan_code ?? null;
    } catch {
      return null;
    }
  }

  private normalizeStatus(status: string): payment_status_enum | null {
    const key = (status || '').toLowerCase();
    return this.STATUS_MAP[key] ?? null;
  }

  private buildStatusUpdate(status: string) {
    const key = (status || '').toLowerCase();
    const enumValue = this.normalizeStatus(key);
    const value = enumValue ? { status: key, status_enum: enumValue } : { status: key };
    return value;
  }

  private isStatus(payment: any, expected: string): boolean {
    const normalized = this.normalizeStatus(expected);
    if (!normalized) return payment.status === expected;
    if (payment.status_enum) return payment.status_enum === normalized;
    return String(payment.status || '').toLowerCase() === (expected || '').toLowerCase();
  }

  /** Tạo URL VNPAY (dùng payment_id làm TxnRef "clean") */
  async createVnpayPayment(
    dto: CreatePaymentDto,
    ip: string,
    idempotencyKey?: string | null,
    planSnapshotParam?: any, // optional: prefer this snapshot when provided (grandfathering)
  ): Promise<{
    paymentId: string;
    plan_code?: string | null;
    vnp_Amount?: any;
    paymentUrl: string;
  }> {
    this.logger.log(
      `[createVnpayPayment] Bắt đầu tạo payment cho user ${dto.user_id}, plan ${dto.plan_code}, IP: ${ip}`,
    );

    if (!dto.user_id) {
      this.logger.error('[createVnpayPayment] Thiếu user_id');
      throw new BadRequestException('user_id is required');
    }
    if (!dto.plan_code) {
      this.logger.error('[createVnpayPayment] Thiếu plan_code');
      throw new BadRequestException('plan_code is required');
    }
    this.logger.debug(`[createVnpayPayment] Tìm plan: ${dto.plan_code}`);
    const plan = await this._paymentRepository.findPlanByCode(dto.plan_code?.toLowerCase() || '');
    if (!plan) {
      this.logger.error(`[createVnpayPayment] Plan ${dto.plan_code} không tìm thấy`);
      throw new BadRequestException('Plan not found');
    }

    // Wrap the entire payment creation in a transaction
    return await this._paymentRepository.executePaymentTransaction(async (tx: any) => {
      // 1) Find the current plan first (or use provided snapshot for deterministic renewals)
      const currentPlan =
        planSnapshotParam ??
        (await tx.plans.findFirst({
          where: {
            code: dto.plan_code ?? '',
            is_current: true,
          },
        }));

      if (!currentPlan) {
        throw new Error(`Plan with code ${dto.plan_code} not found`);
      }

      // 2) Check if this is an upgrade scenario to calculate proration
      const existingSubscription =
        await this._paymentRepository.findActiveSubscriptionByUserIdInTransaction(
          tx,
          dto.user_id || '',
        );

      const selectedBillingPeriod = this.resolveBillingPeriod(
        existingSubscription,
        currentPlan,
        dto.billing_period as BillingPeriod | undefined,
      );
      const selectedBillingType =
        this.normalizeBillingType(dto.billing_type) ?? PlanBillingType.PREPAID;

      // If a plan snapshot (provided as planSnapshotParam) contains a precomputed
      // unit_amount_minor we should prefer it (snapshot is in minor units).
      // Otherwise, fall back to calculating from currentPlan.price.
      let amountSubtotalMajor = (() => {
        try {
          if (currentPlan && (currentPlan as any).unit_amount_minor != null) {
            // plan_snapshot.unit_amount_minor is stored as minor units (×100)
            const minor = BigInt((currentPlan as any).unit_amount_minor);
            return roundMajor(toMajor(minor));
          }
        } catch {
          // ignore and fallback
        }
        return this.calculateBillingAmount(currentPlan, selectedBillingPeriod);
      })();

      let amountTotalMajor = amountSubtotalMajor;
      let finalAmountMajor = amountTotalMajor;
      let isProrationRenewal = false;

      if (existingSubscription) {
        const currentPrice = this.calculateBillingAmount(
          existingSubscription.plans,
          selectedBillingPeriod,
        );
        // Derive newPrice from snapshot when available (unit_amount_minor) to preserve grandfathered pricing
        let newPrice = this.calculateBillingAmount(currentPlan, selectedBillingPeriod);
        try {
          if (currentPlan && (currentPlan as any).unit_amount_minor != null) {
            const minor = BigInt((currentPlan as any).unit_amount_minor);
            newPrice = roundMajor(toMajor(minor));
          } else if ((currentPlan as any).unit_amount != null) {
            // legacy: unit_amount may be present (major)
            newPrice = Number((currentPlan as any).unit_amount);
          }
        } catch {
          // keep calculated value on error
        }

        const action: 'upgrade' | 'downgrade' | 'renew' =
          newPrice > currentPrice ? 'upgrade' : newPrice < currentPrice ? 'downgrade' : 'renew';

        if (action === 'upgrade') {
          const now = new Date();
          const periodStart = existingSubscription.current_period_start;
          const periodEnd = existingSubscription.current_period_end;

          if (periodStart && periodEnd) {
            const totalPeriodMs = periodEnd.getTime() - periodStart.getTime();
            const remainingMs = Math.max(0, periodEnd.getTime() - now.getTime());

            // Use integer math in minor units to avoid float rounding issues
            const priceDeltaMinor = toMinor(newPrice) - toMinor(currentPrice); // bigint
            let proratedMinor = 0n;
            if (totalPeriodMs > 0) {
              try {
                // Use central prorate util (operates in minor units)
                proratedMinor = prorateMinor(
                  toMinor(currentPrice),
                  toMinor(newPrice),
                  BigInt(remainingMs),
                  BigInt(totalPeriodMs),
                );
                if (proratedMinor < 0n) proratedMinor = 0n;
              } catch (err) {
                // If BigInt proration unexpectedly fails, log and set zero rather than falling back to float math
                this.logger.error(`[createVnpayPayment] BigInt proration error: ${String(err)}`);
                proratedMinor = 0n;
              }
            }

            const amtMajorRounded = roundMajor(toMajor(proratedMinor));
            amountSubtotalMajor = amtMajorRounded;
            amountTotalMajor = amtMajorRounded;
            finalAmountMajor = amtMajorRounded;
            isProrationRenewal = true;

            this.logger.log(
              `[createVnpayPayment] Upgrade proration for payment: deltaMinor=${priceDeltaMinor}, remainingMs=${remainingMs}, proratedMinor=${proratedMinor}`,
            );
          }
        } else if (action === 'renew') {
          amountSubtotalMajor = newPrice;
          amountTotalMajor = newPrice;
          finalAmountMajor = newPrice;
        } else {
          // downgrade
          amountSubtotalMajor = newPrice;
          amountTotalMajor = newPrice;
          finalAmountMajor = newPrice;
        }
      }

      if (!existingSubscription || !isProrationRenewal) {
        finalAmountMajor = amountTotalMajor;
      }

      this.logger.log(
        `[createVnpayPayment] Tạo payment pending với amount: ${finalAmountMajor} VND`,
      );
      // 3) Idempotency: if client supplied an Idempotency-Key, return existing payment if present
      if (idempotencyKey) {
        const existed = await tx.payments.findFirst({ where: { idempotency_key: idempotencyKey } });
        if (existed) {
          // If a vnp txn ref exists, reconstruct paymentUrl from stored VNPay params
          if (existed.vnp_txn_ref && existed.vnp_create_date) {
            try {
              const vnpParams: any = {
                vnp_Version: this._config.get<string>('VNP_VERSION') ?? '2.1.0',
                vnp_Command: this._config.get<string>('VNP_COMMAND') ?? 'pay',
                vnp_TmnCode: this._config.getOrThrow<string>('VNP_TMN_CODE'),
                vnp_Amount:
                  existed.amount !== undefined && existed.amount !== null
                    ? toMinor(Number(existed.amount))
                    : toMinor(finalAmountMajor),
                vnp_CurrCode: this._config.get<string>('VNP_CURR_CODE') ?? 'VND',
                vnp_TxnRef: existed.vnp_txn_ref,
                vnp_OrderInfo: existed.vnp_order_info || (dto.description ?? ''),
                vnp_OrderType: this._config.get<string>('VNP_ORDER_TYPE') ?? ProductCode.Other,
                vnp_ReturnUrl: this._config.getOrThrow<string>('VNP_RETURN_URL'),
                vnp_Locale: (this._config.get('VNP_LOCALE') as any) || VnpLocale.VN,
                vnp_CreateDate: String(existed.vnp_create_date),
                vnp_ExpireDate:
                  existed.vnp_expire_date !== undefined && existed.vnp_expire_date !== null
                    ? String(existed.vnp_expire_date)
                    : undefined,
                vnp_IpAddr: ip || '127.0.0.1',
              };

              const paymentUrl = this.buildVnpayPaymentUrl(vnpParams);
              return {
                paymentId: existed.payment_id,
                plan_code: existed.delivery_data?.plan_code,
                vnp_Amount: existed.amount,
                paymentUrl,
              };
            } catch (err) {
              void err;
              // fallback to returning basic info
              return {
                paymentId: existed.payment_id,
                plan_code: existed.delivery_data?.plan_code,
                vnp_Amount: existed.amount,
                paymentUrl: '',
              };
            }
          }
          // If no vnp_txn_ref yet, return minimal info (client can retry to generate link)
          return {
            paymentId: existed.payment_id,
            plan_code: existed.delivery_data?.plan_code,
            vnp_Amount: existed.amount,
            paymentUrl: '',
          };
        }
      }

      // 4) Tạo payment pending (chưa có vnpTxnRef)
      let payment = await tx.payments.create({
        data: {
          ...this.buildStatusUpdate('pending'),
          provider: 'vn_pay',
          // payments.amount stored as major VND (BigInt)
          amount: BigInt(finalAmountMajor),
          description: dto.description ?? `Lifetime ${dto.plan_code}`,
          user_id: dto.user_id ?? '',
          delivery_data: {
            plan_code: currentPlan.code,
            plan_version: currentPlan.version,
            billing_period: selectedBillingPeriod,
            billing_type: selectedBillingType,
          },
          version: currentPlan.version ?? null,
          idempotency_key: idempotencyKey ?? null,
        },
      });
      this.logger.log(`[createVnpayPayment] Đã tạo payment ${payment.payment_id}`);

      // 4) Tìm subscription hiện tại của user để tạo transaction
      if (existingSubscription) {
        this.logger.debug(
          `[createVnpayPayment] Tìm thấy subscription hiện tại: ${existingSubscription.subscription_id}`,
        );

        // Tạo transaction cho upgrade
        try {
          // Determine action based on price delta
          const currentPrice = this.calculateBillingAmount(
            existingSubscription.plans,
            selectedBillingPeriod,
          );
          const newPrice = this.calculateBillingAmount(currentPlan, selectedBillingPeriod);
          const action: 'upgrade' | 'downgrade' | 'renew' =
            newPrice > currentPrice ? 'upgrade' : newPrice < currentPrice ? 'downgrade' : 'renew';

          // Calculate proration for upgrade
          let amountSubtotalMajor = newPrice;
          let amountTotalMajor = newPrice;
          let isProration = false;
          let prorationChargeMajor = 0;
          let prorationCreditMajor = 0;

          if (action === 'upgrade') {
            // Calculate proration based on remaining time in current period
            const now = new Date();
            const periodStart = existingSubscription.current_period_start;
            const periodEnd = existingSubscription.current_period_end;

            if (periodStart && periodEnd) {
              const totalPeriodMs = periodEnd.getTime() - periodStart.getTime();
              const remainingMs = Math.max(0, periodEnd.getTime() - now.getTime());

              // Integer-based proration in minor units
              const priceDeltaMinor = toMinor(newPrice) - toMinor(currentPrice);
              let proratedMinor = 0n;
              if (totalPeriodMs > 0) {
                try {
                  // Use centralized BigInt proration util for consistency
                  proratedMinor = prorateMinor(
                    toMinor(currentPrice),
                    toMinor(newPrice),
                    BigInt(remainingMs),
                    BigInt(totalPeriodMs),
                  );
                  if (proratedMinor < 0n) proratedMinor = 0n;
                } catch (err) {
                  this.logger.error(
                    `[createVnpayPayment] BigInt proration error (tx): ${String(err)}`,
                  );
                  proratedMinor = 0n;
                }
              }

              const amtMajorRounded = roundMajor(toMajor(proratedMinor));
              amountSubtotalMajor = amtMajorRounded;
              amountTotalMajor = amtMajorRounded;
              isProration = true;
              prorationChargeMajor = amtMajorRounded;
              prorationCreditMajor = 0;

              this.logger.log(
                `[createVnpayPayment] Upgrade proration calculated (minor): deltaMinor=${priceDeltaMinor}, remainingMs=${remainingMs}, proratedMinor=${proratedMinor}`,
              );
            }
          }

          const transaction = await tx.transactions.create({
            data: {
              // Link transaction to subscription via nested connect (do not set scalar agreement_id here - Prisma expects nested relation input)
              // agreement_id: existingSubscription.subscription_id,
              plan_code: currentPlan.code,
              // Persist immutable snapshot for the transaction (required by Prisma schema)
              plan_snapshot: this.normalizePlanSnapshot(currentPlan),
              plan_snapshot_new: this.normalizePlanSnapshot(currentPlan),
              // store transaction amounts as minor units (×100)
              amount_subtotal: toMinor(amountSubtotalMajor),
              amount_total: toMinor(amountTotalMajor),
              currency: 'VND',
              period_start: existingSubscription.current_period_start ?? new Date(),
              // Prisma schema requires `period_end` to be non-null; default to current_period_end or now
              period_end: existingSubscription.current_period_end ?? new Date(),
              status: 'draft',
              effective_action: action,
              provider: 'vn_pay',
              // Direct nested link to payment (Prisma expects nested connect input)
              payment: { connect: { payment_id: payment.payment_id } },
              // Ensure provider_payment_id is set so PaymentEventService can match the transaction
              provider_payment_id: payment.payment_id,
              is_proration: isProration,
              proration_charge: toMinor(prorationChargeMajor),
              proration_credit: toMinor(prorationCreditMajor),
              // Connect the required subscriptions relation so Prisma validation passes
              subscriptions: {
                connect: { subscription_id: existingSubscription.subscription_id },
              },
            },
          });

          this.logger.log(
            `[createVnpayPayment] Transaction ${transaction.tx_id} created for payment ${payment.payment_id}`,
          );
        } catch (error) {
          this.logger.error(`[createVnpayPayment] Lỗi tạo transaction:`, error);
          throw error; // Re-throw to rollback transaction
        }
      } else {
        this.logger.debug(
          `[createVnpayPayment] Không tìm thấy subscription active cho user ${dto.user_id}`,
        );
      }

      const { paymentUrl, vnpTxnRef } = await this.generateVnpayPaymentLink(tx, {
        paymentId: payment.payment_id,
        amountMajor: Number(payment.amount ?? finalAmountMajor),
        description: payment.description || `Thanh toan ${dto.plan_code}`,
        ipAddr: ip,
      });

      payment = {
        ...payment,
        vnp_txn_ref: vnpTxnRef,
      };

      this.logger.log(
        `[createVnpayPayment] Đã tạo payment URL thành công cho payment ${payment.payment_id}`,
      );
      this.logger.debug('[VNPay] paymentUrl:', paymentUrl);
      return {
        paymentId: payment.payment_id,
        plan_code: this.extractPlanCode(payment) || dto.plan_code,
        vnp_Amount: payment.amount,
        paymentUrl,
      };
    });
  }

  /** Truy vấn VNPay queryDr theo ref (payment_id hoặc vnpTxnRef). Có throttle và cache. */
  async queryDr(ref: string, ip = '127.0.0.1') {
    this.logger.log(`[queryDr] Bắt đầu query trạng thái thanh toán cho ref: ${ref}, IP: ${ip}`);

    const clean = ref.replace(/-/g, '');
    const cacheKey = `querydr:${clean}`;

    // Check cache first
    const cachedResult = await this._cacheService.get(cacheKey);
    if (cachedResult) {
      this.logger.debug(`[queryDr] Trả về kết quả từ cache cho ref: ${ref}`);
      return cachedResult;
    }

    // Throttle để tránh lỗi 94 của VNPay
    const COOLDOWN_MS = 15000;
    type ThrottleMap = Map<string, number>;
    const g = globalThis as typeof globalThis & { __vnpayQueryDrThrottle?: ThrottleMap };
    if (!g.__vnpayQueryDrThrottle) g.__vnpayQueryDrThrottle = new Map();
    const lastQueryAt = g.__vnpayQueryDrThrottle;

    const now = Date.now();
    const last = lastQueryAt.get(clean) ?? 0;
    if (now - last < COOLDOWN_MS) {
      const nextInMs = Math.max(0, COOLDOWN_MS - (now - last));
      this.logger.warn(`[queryDr] Throttled cho ${clean}, cần chờ ${nextInMs}ms nữa`);
      return { status: 'throttled', nextInMs, message: 'Please wait before retrying queryDr' };
    }
    lastQueryAt.set(clean, now);

    this.logger.debug(
      `[queryDr] Xác thực trạng thái giao dịch: ref=${ref}, clean=${clean}, ip=${ip}`,
    );

    // Tìm payment theo payment_id (UUID) hoặc theo vnpTxnRef (đã clean)
    this.logger.debug(`[queryDr] Tìm payment trong database`);
    let payment =
      (await this._paymentRepository.findByPaymentId(ref)) ||
      (await this._paymentRepository.findByVnpTxnRef(clean));

    if (!payment || !payment.vnp_txn_ref || !payment.vnp_create_date) {
      this.logger.warn(`[queryDr] Payment không tìm thấy hoặc thiếu VNPay fields: ${clean}`);
      throw new NotFoundException(`Payment or VNPay fields not found for ref: ${ref}`);
    }

    this.logger.debug(
      `[queryDr] Tìm thấy payment ${payment.payment_id}, vnpTxnRef: ${payment.vnp_txn_ref}`,
    );

    this.logger.debug(`[queryDr] Gọi VNPay queryDr API`);
    // Gọi VNPay queryDr
    let drResult: any;
    try {
      drResult = await this._vnpay.queryDr({
        vnp_RequestId: Math.random().toString(36).slice(2, 10),
        vnp_IpAddr: ip,
        vnp_TxnRef: payment.vnp_txn_ref,
        vnp_OrderInfo: `Query ${ref}`,
        vnp_CreateDate: Number(payment.vnp_create_date),
        vnp_TransactionDate: Number(payment.vnp_create_date),
        vnp_TransactionNo: 0, // Will be set by VNPay
      });
      this.logger.debug(`[queryDr] VNPay queryDr result: ${JSON.stringify(drResult)}`);
    } catch (err: any) {
      // Undici/fetch errors may surface as TypeError with a cause indicating TLS issues (CERT_HAS_EXPIRED)
      // Normalize diagnostic values
      const causeCode = err?.code || err?.cause?.code || err?.cause?.errno;
      const causeMessage = String(err?.message || err?.cause?.message || '')
        .toLowerCase()
        .trim();

      // Log the error (guarded) so production code does not throw during cron runs
      this.logger.error(`[queryDr] VNPay queryDr call failed for ref=${ref}: ${String(err)}`);

      // Detect certificate problems or fetch failures by code or by message substring
      const looksLikeCertExpired =
        causeCode === 'CERT_HAS_EXPIRED' ||
        (err?.cause && err.cause.code === 'CERT_HAS_EXPIRED') ||
        causeMessage.includes('certificate has expired') ||
        causeMessage.includes('certificate_expired') ||
        causeMessage.includes('fetch failed');

      if (looksLikeCertExpired) {
        // In sandbox mode we don't want to create operational alerts or spam the alerts table.
        // Comment out alert creation for now. Keep returning the stable error object so callers
        // can still detect and set cooldowns if needed.
        /*
        try {
          if (payment?.user_id && payment?.payment_id) {
            this._alertsService
              .create({
                event_id: payment.payment_id,
                user_id: payment.user_id,
                alert_type: 'warning',
                severity: 'critical',
                alert_message: `VNPay queryDr failed for payment ${payment.payment_id}: ${String(
                  err?.message || err,
                )}`,
                alert_data: {
                  payment_id: payment.payment_id,
                  vnpTxnRef: payment.vnp_txn_ref,
                  error: String(err?.message || err),
                },
              })
              .catch((e) => this.logger.error('[queryDr] Failed to create alert record', e));
          }
        } catch (e) {
          this.logger.error('[queryDr] Error while invoking AlertsService:', e);
        }
        */

        return {
          status: 'error',
          payment_id: payment?.payment_id,
          vnpTxnRef: payment?.vnp_txn_ref,
          responseCode: 'XX',
          transactionStatus: '',
          message: 'VNPay TLS certificate has expired or fetch failed',
          isSuccess: false,
          errorCode: 'CERT_HAS_EXPIRED',
          rawError: String(err?.message || err),
        };
      }

      // Re-throw other errors so upstream logic can decide
      throw err;
    }

    // Process results and update payment status...
    const processedResult = await this.processQueryDrResult(drResult, payment);

    // Cache the result for 60 seconds
    await this._cacheService.set(cacheKey, processedResult, { ttl: 60 });

    return processedResult;
  }

  /** Process queryDr result and map VNPay response codes */
  private async processQueryDrResult(drResult: any, payment: any) {
    const responseCode = String(drResult.vnp_ResponseCode || '99');
    const transactionStatus = String(drResult.vnp_TransactionStatus || '');

    this.logger.debug(
      `[processQueryDrResult] Processing response code: ${responseCode}, tx status: ${transactionStatus}`,
    );

    // Map VNPay response codes according to requirements
    switch (responseCode) {
      case '00':
        // Success: persist & terminate
        if (!this.isStatus(payment, 'paid')) {
          // Conditional update to avoid duplicate post-processing in concurrent IPN/Return
          const up = await this._prismaService.payments.updateMany({
            where: { payment_id: payment.payment_id, status: { not: 'paid' } },
            data: this.buildStatusUpdate('paid'),
          });
          if (up.count > 0) {
            try {
              await this._paymentEventService.handlePaymentSuccess(payment.payment_id);
            } catch (err) {
              this.logger.error(
                `[processQueryDrResult] Error while handling payment success for ${payment.payment_id}:`,
                err,
              );
              // Bubble up the error result but keep the payment status updated
              return {
                status: 'success',
                payment_id: payment.payment_id,
                vnpTxnRef: payment.vnp_txn_ref,
                responseCode,
                transactionStatus,
                message: 'Payment successful but post-processing failed',
                isSuccess: true,
              };
            }
          } else {
            this.logger.debug(
              `[processQueryDrResult] Payment ${payment.payment_id} already marked as paid`,
            );
          }
        }
        return {
          status: 'success',
          payment_id: payment.payment_id,
          vnpTxnRef: payment.vnp_txn_ref,
          responseCode,
          transactionStatus,
          message: 'Payment successful',
          isSuccess: true,
        };

      case '94':
        // Duplicate: return 429 + wait instruction
        return {
          status: 'duplicate',
          payment_id: payment.payment_id,
          vnpTxnRef: payment.vnp_txn_ref,
          responseCode,
          transactionStatus,
          message: 'Transaction is being processed. Please wait and try again later.',
          isSuccess: false,
          httpStatus: 429,
          retryAfter: 30, // seconds
        };

      default:
        // Other error codes: return 5xx
        return {
          status: 'error',
          payment_id: payment.payment_id,
          vnpTxnRef: payment.vnp_txn_ref,
          responseCode,
          transactionStatus,
          message: `Payment failed with code ${responseCode}`,
          isSuccess: false,
          httpStatus: 500,
        };
    }
  }

  /** Return URL: không fail nếu lệch tiền, chỉ log */
  async handleReturn(query: Record<string, any>) {
    this.logger.log(`[handleReturn] Nhận callback từ app:`, JSON.stringify(query, null, 2));

    let verify: any;
    try {
      // Some versions of the vnpay lib may throw for invalid amount/signature — catch to avoid unhandled rejection
      verify = await Promise.resolve(this._vnpay.verifyReturnUrl(query as VerifyReturnUrl));
    } catch (err: any) {
      // Log the original error
      this.logger.error(
        `[handleReturn] VNPay verification failure:`,
        err instanceof Error ? err.message : err,
      );

      // Fallback: some VNPay library versions are strict about amount formats and may throw
      // (e.g. "Invalid amount"). For return URL handling we prefer to try a best-effort
      // verification using our own HMAC check and continue (return URL should not hard-fail
      // the user flow). Attempt to parse rawQuery if available and recompute the secure hash.
      try {
        let rawQueryStr: string;
        if (typeof query === 'string') {
          rawQueryStr = query;
        } else if (typeof (query as any)?.rawQuery === 'string') {
          rawQueryStr = (query as any).rawQuery;
        } else {
          // If query is an object with vnp_ keys, serialize it
          const entries = Object.entries(query as Record<string, any>) as any;
          rawQueryStr = new URLSearchParams(entries).toString();
        }

        const usp = new URLSearchParams(rawQueryStr);
        const providedHash = usp.get('vnp_SecureHash') || '';

        // Build params object excluding secure hash fields
        const paramsObj: Record<string, string> = {};
        for (const [k, v] of usp.entries()) {
          if (!k || !k.startsWith('vnp_')) continue;
          if (k === 'vnp_SecureHash' || k === 'vnp_SecureHashType') continue;
          paramsObj[k] = String(v);
        }

        if (!providedHash) {
          // Give up: cannot verify
          throw new BadRequestException('Invalid VNPay return data');
        }

        const encodingCfg = (this._config.get<string>('VNP_ENCODING') || 'form') as
          | 'form'
          | 'rfc3986';
        const secret = this.getVnpSecret();
        const signed = buildVnpSignedQuery(paramsObj, secret, {
          encoding: encodingCfg,
          includeSecureHashType: true,
        });

        const computedHash = String(signed.hash || '').toUpperCase();
        const providedHashNorm = String(providedHash || '').toUpperCase();

        verify = {
          isVerified: computedHash === providedHashNorm,
          vnp_ResponseCode: usp.get('vnp_ResponseCode') || '',
          vnp_TransactionStatus: usp.get('vnp_TransactionStatus') || '',
          vnp_TxnRef: usp.get('vnp_TxnRef') || usp.get('vnp_TxnRef') || '',
          vnp_Amount: usp.get('vnp_Amount') || usp.get('vnp_Amount'),
          _fallbackVerifiedBy: 'manual-hmac',
          _providedHash: providedHashNorm,
          _computedHash: computedHash,
        } as any;
      } catch (fallbackErr) {
        this.logger.error('[handleReturn] Fallback VNPay verification also failed:', fallbackErr);
        throw new BadRequestException('Invalid VNPay return data');
      }
    }

    this.logger.debug(`[handleReturn] Signature verification result:`, {
      isVerified: verify.isVerified,
      vnp_ResponseCode: (verify as any).vnp_ResponseCode,
      vnp_TransactionStatus: (verify as any).vnp_TransactionStatus,
      vnp_TxnRef: (verify as any).vnp_TxnRef,
      vnp_Amount: (verify as any).vnp_Amount,
    });

    if (!verify.isVerified) {
      // For return flows in tests and strict UX checks, treat invalid signature as a bad request.
      // IPN remains authoritative for server-to-server verification, but for the redirect flow
      // we surface an explicit error to the client when signature verification fails.
      this.logger.warn(`[handleReturn] Invalid signature - rejecting return flow`);
      throw new BadRequestException('Invalid VNPay return data');
    }

    const vnpTxnRef = String(verify.vnp_TxnRef);
    this.logger.debug(`[handleReturn] Tìm payment với vnpTxnRef: ${vnpTxnRef}`);

    const payment = await this._paymentRepository.findByVnpTxnRef(vnpTxnRef);
    if (!payment) {
      this.logger.error(`[handleReturn] Payment không tìm thấy cho vnpTxnRef: ${vnpTxnRef}`);
      this.logger.error(`[handleReturn] Available payments in DB (last 5):`);
      const recentPayments = await this._prismaService.payments.findMany({
        take: 5,
        orderBy: { created_at: 'desc' },
        select: { payment_id: true, vnp_txn_ref: true, status: true, amount: true },
      });
      this.logger.error(`[handleReturn] Recent payments:`, recentPayments);
      throw new NotFoundException('Payment not found');
    }

    this.logger.debug(`[handleReturn] Tìm thấy payment:`, {
      payment_id: payment.payment_id,
      status: payment.status,
      amount: payment.amount,
      plan_code: this.extractPlanCode(payment),
      created_at: payment.created_at,
    });

    const vnpAmountRaw = (verify as any).vnp_Amount;
    const amountMajor = Number(payment.amount); // e.g. 299000 VND

    // Use robust comparator that accepts VNPay's varying amount representations
    // (minor units, major units, or library-specific transformations).
    const amountMatches = equalsVnpAmount(vnpAmountRaw, amountMajor);
    if (!amountMatches) {
      this.logger.warn(
        `[handleReturn] Amount mismatch (non-fatal): expected=${amountMajor} VND, got=${String(
          vnpAmountRaw,
        )}, paymentId=${payment.payment_id}, vnpTxnRef=${vnpTxnRef}`,
      );
    }

    this.logger.debug(`[handleReturn] Amount verification:`, {
      vnpAmountRaw,
      expectedAmountMajor: amountMajor,
      matches: amountMatches,
    });

    const code = String(verify.vnp_ResponseCode);
    const txStatus = String(verify.vnp_TransactionStatus);
    const isSuccess = code === '00' && txStatus === '00';

    this.logger.debug(`[handleReturn] Payment status analysis:`, {
      responseCode: code,
      transactionStatus: txStatus,
      isSuccess,
      currentPaymentStatus: payment.status,
    });

    // Update payment status if successful (fallback for missing IPN)
    if (isSuccess) {
      // Conditional update: only act if we moved the status to 'paid'
      const up = await this._prismaService.payments.updateMany({
        where: { payment_id: payment.payment_id, status: { not: 'paid' } },
        data: this.buildStatusUpdate('paid'),
      });
      if (up.count > 0) {
        this.logger.log(
          `[handleReturn] Cập nhật payment status thành 'paid' cho payment ${payment.payment_id}`,
        );
        this.logger.log(
          `[handleReturn] Triggering payment success hooks for ${payment.payment_id}`,
        );
        try {
          await this._paymentEventService.handlePaymentSuccess(payment.payment_id);
        } catch (err) {
          this.logger.error(
            `[handleReturn] Error while processing payment success for ${payment.payment_id}:`,
            err,
          );
          throw err;
        }
      } else {
        this.logger.debug(
          `[handleReturn] Payment đã được xử lý trước đó, status: ${payment.status}`,
        );
      }
    } else {
      this.logger.log(`[handleReturn] Payment không thành công, không cập nhật status`);
    }

    const result = {
      payment_id: payment.payment_id,
      vnpTxnRef: payment.vnp_txn_ref,
      plan_code: this.extractPlanCode(payment),
      responseCode: code,
      transactionStatus: txStatus,
      isVerified: verify.isVerified,
      isSuccess,
      status: payment.status,
      verify,
      raw: query,
    };

    this.logger.debug(`[handleReturn] Trả về kết quả: ${JSON.stringify(result, null, 2)}`);
    return result;
  }

  /** IPN: bắt buộc khớp amount*100 */
  async handleIpn(query: Record<string, any>) {
    this.logger.log(`[handleIpn] Nhận callback từ VNPay IPN:`, { query });

    const statusDescMap: Record<string, string> = {
      paid: 'Giao dịch thành công',
      pending: 'Giao dịch đang xử lý hoặc chưa hoàn tất',
      canceled: 'Giao dịch đã bị hủy',
      failed: 'Giao dịch thất bại',
    };

    const receivedAt = new Date().toISOString();
    this.logger.debug(`[handleIpn] Xác thực IPN signature, receivedAt: ${receivedAt}`);

    const verify = this._vnpay.verifyIpnCall(query as VerifyIpnCall);
    if (!verify.isVerified) {
      this.logger.error(`[handleIpn] Invalid signature`);
      return { RspCode: '97', Message: 'Invalid signature' };
    }

    const vnpTxnRef = String(verify.vnp_TxnRef);
    this.logger.debug(`[handleIpn] Tìm payment với vnpTxnRef: ${vnpTxnRef}`);

    const payment = await this._paymentRepository.findByVnpTxnRef(vnpTxnRef);
    if (!payment) {
      this.logger.error(`[handleIpn] Order not found: ${vnpTxnRef}`);
      return { RspCode: '01', Message: 'Order not found' };
    }

    this.logger.debug(
      `[handleIpn] Tìm thấy payment ${payment.payment_id}, amount: ${payment.amount}`,
    );

    const vnpAmountRaw = (verify as any).vnp_Amount;
    if (!equalsVnpAmount(vnpAmountRaw, Number(payment.amount))) {
      this.logger.error(
        `[handleIpn] Amount mismatch: got=${vnpAmountRaw}, expect=${toMinor(Number(payment.amount))}`,
      );
      return {
        RspCode: '04',
        Message:
          'Amount mismatch: got=' + vnpAmountRaw + ', expect=' + toMinor(Number(payment.amount)),
      };
    }

    const code = String(verify.vnp_ResponseCode);
    const txStatus = String(verify.vnp_TransactionStatus);
    const isSuccess = code === '00' && txStatus === '00';

    this.logger.debug(
      `[handleIpn] Xử lý response: code=${code}, txStatus=${txStatus}, isSuccess=${isSuccess}`,
    );

    // Update payment status using conditional update to ensure idempotency
    const newStatus = isSuccess ? 'paid' : code === '24' ? 'canceled' : 'failed';

    if (isSuccess) {
      const up = await this._prismaService.payments.updateMany({
        where: { payment_id: payment.payment_id, status: { not: 'paid' } },
        data: this.buildStatusUpdate('paid'),
      });
      this.logger.log(
        `[handleIpn] Cập nhật payment status thành: ${newStatus}, updated=${up.count}`,
      );

      if (up.count > 0) {
        this.logger.log(`[handleIpn] Phát hành subscription và cập nhật subscription`);
        try {
          await this._paymentEventService.handlePaymentSuccess(payment.payment_id);
        } catch (err) {
          const errorContext = {
            paymentId: payment.payment_id,
            userId: payment.user_id,
            amount: Number(payment.amount),
            planCode: this.extractPlanCode(payment),
            error: err instanceof Error ? err.message : String(err),
            stack: err instanceof Error ? err.stack : undefined,
          };

          this.logger.error(
            `[handleIpn] Critical error processing payment success for ${payment.payment_id}:`,
            errorContext,
          );

          // Log to subscription_histories for audit trail
          try {
            await this._prismaService.subscription_histories.create({
              data: {
                subscription_id: 'system', // Use system for payment processing errors
                event_type: 'activated', // Use activated type for payment events
                event_data: {
                  ...errorContext,
                  event_subtype: 'payment_processing_error',
                },
                created_at: new Date(),
              },
            });
          } catch (logErr) {
            this.logger.error(`[handleIpn] Failed to log error to audit trail:`, logErr);
          }

          return {
            RspCode: '99',
            Message: 'Processing error',
            status: newStatus,
            payment_id: payment.payment_id,
            vnpTxnRef,
            error_details: errorContext,
          };
        }
      } else {
        this.logger.debug(`[handleIpn] Payment ${payment.payment_id} already processed as paid`);
      }
    } else {
      await this._paymentRepository.updatePaymentStatus(payment.payment_id, newStatus);
      this.logger.log(`[handleIpn] Cập nhật payment status thành: ${newStatus}`);

      if (newStatus === 'failed') {
        await this.emitPaymentFailureEvent(payment, code, txStatus);
      }
    }

    return {
      RspCode: '00',
      Message: 'Confirm Success',
      status: newStatus,
      statusDesc: statusDescMap[newStatus] || 'Không xác định',
      payment_id: payment.payment_id,
      vnpTxnRef,
    };
  }

  async listPayments(userId?: string, planCode?: string) {
    this.logger.debug(
      `[listPayments] Lấy danh sách payments: userId=${userId}, planCode=${planCode}`,
    );
    return await this._paymentRepository.findPayments(userId, planCode);
  }

  // Temporary debug method
  async debugCheckTransaction(paymentId: string) {
    this.logger.debug(`[debugCheckTransaction] Checking transaction for payment ${paymentId}`);

    const payment = await this._paymentRepository.findByPaymentId(paymentId);
    const transaction = await this._paymentRepository.findTransactionByPaymentId(paymentId);

    return {
      payment: payment
        ? {
            payment_id: payment.payment_id,
            status: payment.status,
            amount: payment.amount,
            plan_code: (payment.delivery_data as any)?.plan_code || undefined,
            created_at: payment.created_at,
          }
        : null,
      transaction: transaction
        ? {
            tx_id: transaction.tx_id,
            provider_payment_id: transaction.provider_payment_id,
            subscription_id: transaction.subscription_id,
            status: transaction.status,
            amount_total: transaction.amount_total,
            created_at: transaction.created_at,
          }
        : null,
    };
  }

  // Test method to simulate payment success
  async testMarkPaymentAsPaid(paymentId: string) {
    this.logger.debug(`[testMarkPaymentAsPaid] Marking payment ${paymentId} as paid`);

    const payment = await this._paymentRepository.findByPaymentId(paymentId);
    if (!payment) {
      throw new NotFoundException(`Payment ${paymentId} not found`);
    }

    if (this.isStatus(payment, 'paid')) {
      this.logger.debug(`[testMarkPaymentAsPaid] Payment ${paymentId} already paid`);
      return payment;
    }

    // Update payment status to 'paid'
    const updatedPayment = await this._paymentRepository.updatePaymentStatus(paymentId, 'paid');
    this.logger.debug(`[testMarkPaymentAsPaid] Payment ${paymentId} marked as paid`);

    // Trigger post-processing used in real IPN/Return flows so tests exercise subscription issuance.
    try {
      await this._paymentEventService.handlePaymentSuccess(paymentId);
      this.logger.log(`[testMarkPaymentAsPaid] Triggered handlePaymentSuccess for ${paymentId}`);
    } catch (err) {
      this.logger.error(
        `[testMarkPaymentAsPaid] Error while triggering handlePaymentSuccess for ${paymentId}:`,
        err,
      );
      // Continue and return the updated payment regardless of event processing result
    }

    return updatedPayment;
  }

  /**
   * Create auto-renewal payment for subscription - idempotent by (subscription_id, period_end)
   * Handles dunning logic and payment processing with proper transaction safety
   */
  async createAutoRenewalPayment(subscription: any): Promise<{
    success: boolean;
    transaction?: any;
    error?: string;
    isRetry?: boolean;
  }> {
    const subscriptionId = subscription.subscription_id;
    const periodEnd = subscription.current_period_end;

    this.logger.log(
      `[createAutoRenewalPayment] Starting auto-renewal for subscription ${subscriptionId}, period_end: ${periodEnd}`,
    );

    // Idempotency check: ensure only one renewal transaction per period
    const existingTx = await this._prismaService.transactions.findFirst({
      where: {
        subscription_id: subscriptionId,
        effective_action: 'renew',
        period_end: periodEnd,
      },
    });

    if (existingTx) {
      this.logger.log(
        `[createAutoRenewalPayment] Idempotent: renewal transaction ${existingTx.tx_id} already exists for period ${periodEnd}`,
      );
      return { success: true, transaction: existingTx, isRetry: false };
    }

    // Check if this is a retry attempt
    const isRetry = subscription.status === 'past_due' || subscription.renewal_attempt_count > 0;

    return this._prismaService.$transaction(async (prisma) => {
      try {
        // Double-check idempotency within transaction
        const txCheck = await prisma.transactions.findFirst({
          where: {
            subscription_id: subscriptionId,
            effective_action: 'renew',
            period_end: periodEnd,
          },
        });

        if (txCheck) {
          this.logger.log(
            `[createAutoRenewalPayment] Idempotent within tx: renewal transaction ${txCheck.tx_id} already exists`,
          );
          return { success: true, transaction: txCheck, isRetry };
        }

        // Get current plan details
        // Prefer a stored plan_snapshot on subscription (grandfathering) otherwise use joined plan
        const planSnapshot =
          subscription.plan_snapshot && Object.keys(subscription.plan_snapshot).length
            ? this.convertBigIntToString(subscription.plan_snapshot)
            : subscription.plans
              ? this.convertBigIntToString(subscription.plans)
              : null;

        const planObj = planSnapshot; // canonical object used below

        if (!planSnapshot) {
          throw new Error('Subscription has no associated plan or plan_snapshot');
        }

        // Determine renewal amount in minor units (prefer unit_amount_minor if present)
        let renewalAmountMinor: bigint | null = null;
        if (planSnapshot.unit_amount_minor != null) {
          renewalAmountMinor = BigInt(planSnapshot.unit_amount_minor);
        } else if (planSnapshot.unit_amount != null) {
          // fallback if older snapshot uses unit_amount (major)
          renewalAmountMinor = toMinor(Number(planSnapshot.unit_amount));
        } else if (planSnapshot.price != null) {
          renewalAmountMinor = toMinor(Number(planSnapshot.price));
        }

        if (renewalAmountMinor == null || renewalAmountMinor <= 0n) {
          throw new Error('Invalid renewal amount from plan snapshot');
        }

        const renewalAmount = Number(renewalAmountMinor) / 100; // major for human-readable

        // Create renewal transaction (or invoice for postpaid plans)
        if (String(planObj.billing_type || '').toLowerCase() === PlanBillingType.POSTPAID) {
          // Postpaid: generate an invoice (unpaid) and do not attempt immediate charge here.
          const invoiceTx = await this.createPostpaidInvoiceInTransaction(
            prisma,
            subscription,
            planObj,
            renewalAmount,
            periodEnd,
          );

          this.logger.log(
            `[createAutoRenewalPayment] Created postpaid invoice transaction ${invoiceTx.tx_id} for subscription ${subscriptionId}`,
          );

          // For postpaid, we consider this step successful (invoice created)
          return { success: true, transaction: invoiceTx, isRetry };
        }

        const transaction = await prisma.transactions.create({
          data: {
            subscription_id: subscriptionId,
            plan_code: planObj.code,
            plan_id: planObj.id,
            plan_snapshot: planObj,
            plan_snapshot_new: planObj, // Same plan for renewal
            amount_subtotal: renewalAmountMinor, // already in minor units (BigInt)
            amount_total: renewalAmountMinor,
            currency: 'VND',
            period_start: subscription.current_period_start,
            period_end: periodEnd,
            status: 'open',
            effective_action: 'renew',
            provider: 'vn_pay', // Default to VNPay, can be extended
            is_proration: false,
            proration_charge: 0n,
            proration_credit: 0n,
            notes: `Auto-renewal for period ending ${periodEnd.toISOString()}`,
          },
        });

        // For PREPAID plans: create a VNPay pending payment and return payment URL
        try {
          // Create payment record in the same transaction
          const payment = await prisma.payments.create({
            data: {
              status: 'pending',
              user_id: subscription.user_id,
              provider: 'vn_pay',
              amount: BigInt(Math.round(renewalAmount)), // store major VND to match createVnpayPayment convention
              description: `Auto-renewal for ${planObj.name} - Period ending ${periodEnd.toISOString().split('T')[0]}`,
              delivery_data: { plan_code: planObj.code, plan_version: planObj.version },
              version: planObj.version ?? null,
            },
          });

          // Link payment to transaction
          await prisma.transactions.update({
            where: { tx_id: transaction.tx_id },
            data: { payment_id: payment.payment_id, provider_payment_id: payment.payment_id },
          });

          const { paymentUrl } = await this.generateVnpayPaymentLink(prisma, {
            paymentId: payment.payment_id,
            amountMajor: Number(payment.amount ?? renewalAmount),
            description: payment.description || `Thanh toan ${planObj.code}`,
            ipAddr: '127.0.0.1',
          });

          return { success: true, transaction, isRetry, paymentUrl };
        } catch (err: any) {
          this.logger.error(
            `[createAutoRenewalPayment] Error creating payment link for subscription ${subscriptionId}:`,
            err,
          );
          // Mark transaction as failed and handle dunning similar to charge failure
          await this.handleRenewalFailure(
            prisma,
            subscription,
            transaction,
            String(err?.message || err),
          );
          return { success: false, transaction, error: String(err?.message || err), isRetry };
        }
      } catch (error: any) {
        this.logger.error(
          `[createAutoRenewalPayment] Error creating renewal payment for ${subscriptionId}:`,
          error,
        );
        return { success: false, error: error.message, isRetry };
      }
    });
  }

  /** Create a manual/admin-created payment with sensible defaults */
  async createManualPayment(data: {
    user_id: string;
    amount: number | bigint;
    description?: string;
    delivery_data?: any;
    provider?: string;
  }) {
    const provider = (data.provider as any) || 'manual';
    const delivery: any = this.ensureDeliveryData(data.delivery_data || {});

    // Try enrich with plan_version if plan_code is present
    let planVersion: string | null = null;
    if (delivery.plan_code) {
      try {
        const plan = await this._prismaService.plans.findFirst({
          where: { code: String(delivery.plan_code), is_current: true },
        });
        planVersion = plan?.version ?? null;
        if (planVersion) {
          delivery.plan_version = planVersion;
        }
      } catch {}
    }

    const payment = await this._prismaService.payments.create({
      data: {
        ...this.buildStatusUpdate('paid'),
        user: { connect: { user_id: data.user_id } },
        provider: provider as any,
        amount: BigInt(Number(data.amount || 0)),
        description:
          data.description ?? `Manual payment by admin for ${delivery.plan_code ?? 'unknown'}`,
        delivery_data: delivery,
        version: planVersion,
      },
    });

    return payment;
  }

  // Admin/debug: trigger post-processing for a given payment (even if already marked paid)
  async triggerPaymentSuccessProcessing(paymentId: string) {
    await this._paymentEventService.handlePaymentSuccess(paymentId);
    return { ok: true, paymentId };
  }

  async cancelPendingVnpayPayment(
    paymentId: string,
    options?: { reason?: string },
  ): Promise<{ success: boolean; paymentId: string }> {
    const payment = await this._prismaService.payments.findUnique({
      where: { payment_id: paymentId },
      include: {
        transactions: true,
      },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    if (String(payment.provider || '').toLowerCase() !== 'vn_pay') {
      throw new Error('Only VNPay payments can be cancelled via this method');
    }

    if (String(payment.status || '').toLowerCase() !== 'pending') {
      throw new Error('Payment is not pending');
    }

    await this._prismaService.$transaction(async (prisma) => {
      await prisma.payments.update({
        where: { payment_id: paymentId },
        data: {
          status: 'cancelled' as any,
        },
      });

      if (payment.transactions) {
        await prisma.transactions.update({
          where: { tx_id: payment.transactions.tx_id },
          data: {
            status: 'void' as any,
            notes: options?.reason
              ? `${payment.transactions.notes ?? ''} | Cancelled: ${options.reason}`
              : payment.transactions.notes,
          },
        });
      }
    });

    return { success: true, paymentId };
  }

  private async emitPaymentFailureEvent(payment: any, code: string, txStatus: string) {
    await this._paymentEventService.handlePaymentFailed({
      paymentId: payment.payment_id,
      userId: payment.user_id,
      amount: Number(payment.amount),
      planCode: this.extractPlanCode(payment),
      errorCode: code,
      transactionStatus: txStatus,
    });
  }

  private resolveBillingPeriod(
    subscription: any,
    plan: any,
    requested?: BillingPeriod,
  ): BillingPeriod {
    if (requested && requested === 'monthly') {
      return requested;
    }

    const subPeriod = subscription?.billing_period as BillingPeriod | undefined;
    if (subPeriod && subPeriod !== 'none') {
      return subPeriod;
    }

    const planPeriod = plan?.billing_period as BillingPeriod | undefined;
    if (planPeriod && planPeriod !== 'none') {
      return planPeriod;
    }

    return 'monthly';
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

  private calculateBillingAmount(plan: any, billingPeriod: BillingPeriod): number {
    return getPriceForPeriod(plan, billingPeriod);
  }

  @Cron('*/10 * * * *', { timeZone: 'Asia/Ho_Chi_Minh' })
  async expireStaleVnpayPayments() {
    const cutoff = new Date(Date.now() - 15 * 60 * 1000);
    const stalePayments = await this._prismaService.payments.findMany({
      where: {
        provider: 'vn_pay',
        status: 'pending',
        created_at: { lt: cutoff },
      },
      include: {
        transactions: true,
      },
    });

    if (!stalePayments.length) {
      return;
    }

    for (const payment of stalePayments) {
      try {
        await this._prismaService.$transaction(async (prisma) => {
          await prisma.payments.update({
            where: { payment_id: payment.payment_id },
            data: {
              status: 'cancelled' as any,
            },
          });

          const tx = payment.transactions;
          if (tx) {
            await prisma.transactions.update({
              where: { tx_id: tx.tx_id },
              data: {
                status: 'void' as any,
                notes: tx.notes
                  ? `${tx.notes} | auto-cancelled (pending payment expired)`
                  : 'auto-cancelled (pending payment expired)',
              },
            });

            if (this._subscriptionEventRepository) {
              await this._subscriptionEventRepository.createIfNotExistsByEventDataInTransaction(
                prisma as any,
                tx.subscription_id,
                'expired',
                'paymentId',
                payment.payment_id,
                {
                  subscription_id: tx.subscription_id,
                  event_type: 'expired',
                  event_data: {
                    paymentId: payment.payment_id,
                    transactionId: tx.tx_id,
                    expiredAt: new Date().toISOString(),
                  },
                  payment_id: payment.payment_id,
                  tx_id: tx.tx_id,
                } as any,
              );
            }
          }
        });

        this.logger.log(
          `[expireStaleVnpayPayments] Auto-cancelled pending VNPay payment ${payment.payment_id}`,
        );
      } catch (err) {
        this.logger.error(
          `[expireStaleVnpayPayments] Failed to auto-cancel payment ${payment.payment_id}:`,
          err,
        );
      }
    }
  }

  /**
   * Retry failed payment with exponential backoff
   */
  async retryFailedPayment(paymentId: string): Promise<{ success: boolean; message: string }> {
    this.logger.log(`[retryFailedPayment] Bắt đầu retry payment ${paymentId}`);

    try {
      const payment = await this._paymentRepository.findByPaymentId(paymentId);
      if (!payment) {
        return { success: false, message: 'Payment not found' };
      }

      if (payment.status !== 'failed') {
        return { success: false, message: `Payment status is ${payment.status}, not failed` };
      }

      // Check retry limits (max 3 retries)
      const retryCount = await this.getPaymentRetryCount(paymentId);
      if (retryCount >= 3) {
        this.logger.log(
          `[retryFailedPayment] Payment ${paymentId} đã đạt giới hạn retry (${retryCount})`,
        );
        return { success: false, message: 'Max retry attempts reached' };
      }

      // Check if enough time has passed since last retry (exponential backoff)
      const lastRetryAt = await this.getPaymentLastRetryAt(paymentId);
      const now = new Date();
      const backoffMs = this.calculateBackoffMs(retryCount);

      if (lastRetryAt && now.getTime() - lastRetryAt.getTime() < backoffMs) {
        const remainingMs = backoffMs - (now.getTime() - lastRetryAt.getTime());
        return {
          success: false,
          message: `Too soon to retry. Wait ${Math.ceil(remainingMs / 1000 / 60)} more minutes`,
        };
      }

      this.logger.log(
        `[retryFailedPayment] Thực hiện retry lần ${retryCount + 1} cho payment ${paymentId}`,
      );

      // Create new payment URL for retry
      // Try to find related transaction/subscription to prefer plan_snapshot when retrying
      let retryPlanSnapshot: any = undefined;
      try {
        const relatedTx = await this._prismaService.transactions.findFirst({
          where: { payment_id: paymentId },
          include: { subscriptions: true },
        });
        if (relatedTx && relatedTx.subscriptions && relatedTx.subscriptions.plan_snapshot) {
          retryPlanSnapshot = this.convertBigIntToString(relatedTx.subscriptions.plan_snapshot);
        }
      } catch (err) {
        this.logger.debug(
          '[retryFailedPayment] Could not load related transaction for',
          paymentId,
          (err as any)?.message ?? err,
        );
      }

      const retryPayment = await this.createVnpayPayment(
        {
          user_id: payment.user_id,
          plan_code: this.extractPlanCode(payment) || '',
          description: `Retry: ${payment.description}`,
        },
        '127.0.0.1',
        undefined,
        retryPlanSnapshot,
      );

      // Record retry attempt
      await this.recordPaymentRetry(paymentId);

      // Emit retry event
      const newRetryCount = retryCount + 1;
      await this._paymentEventService.handlePaymentRetry(paymentId, newRetryCount);

      const newPaymentId = Array.isArray(retryPayment)
        ? (retryPayment[0] as any)?.paymentId
        : (retryPayment as any)?.paymentId;

      this.logger.log(
        `[retryFailedPayment] Đã tạo payment retry ${newPaymentId} cho payment gốc ${paymentId}`,
      );

      return {
        success: true,
        message: `Retry payment created: ${newPaymentId}`,
      };
    } catch (error) {
      this.logger.error(
        `[retryFailedPayment] Lỗi khi retry payment ${paymentId}: ${String(
          error instanceof Error ? error.message : error,
        )}`,
      );
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async regenerateVnpayPaymentLink(
    paymentId: string,
    options?: { ipAddr?: string; descriptionOverride?: string; amountOverride?: number },
  ): Promise<{ paymentUrl: string; vnpTxnRef: string }> {
    const payment = await this._prismaService.payments.findUnique({
      where: { payment_id: paymentId },
      select: {
        amount: true,
        description: true,
        provider: true,
      },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    if (String(payment.provider || '').toLowerCase() !== 'vn_pay') {
      throw new Error('Only VNPay payments support regeneration');
    }

    const amountMajor =
      options?.amountOverride ??
      (typeof payment.amount === 'bigint' ? Number(payment.amount) : Number(payment.amount ?? 0));

    const description =
      options?.descriptionOverride ?? payment.description ?? 'Thanh toán gia hạn gói dịch vụ';

    return this.generateVnpayPaymentLink(this._prismaService, {
      paymentId,
      amountMajor,
      description,
      ipAddr: options?.ipAddr,
    });
  }

  /**
   * Get retry count for a payment (using cache or database)
   */
  private async getPaymentRetryCount(paymentId: string): Promise<number> {
    // Get the user_id for this payment first
    const payment = await this._prismaService.payments.findUnique({
      where: { payment_id: paymentId },
      select: { user_id: true },
    });

    if (!payment) return 0;

    // For now, use a simple approach - count related payments with similar description
    const relatedPayments = await this._prismaService.payments.findMany({
      where: {
        user_id: payment.user_id,
        description: {
          contains: 'Retry:',
        },
        created_at: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
    });

    return relatedPayments.length;
  }

  /**
   * Get last retry timestamp for a payment
   */
  private async getPaymentLastRetryAt(paymentId: string): Promise<Date | null> {
    // Get the user_id for this payment first
    const payment = await this._prismaService.payments.findUnique({
      where: { payment_id: paymentId },
      select: { user_id: true },
    });

    if (!payment) return null;

    const lastRetry = await this._prismaService.payments.findFirst({
      where: {
        user_id: payment.user_id,
        description: {
          contains: 'Retry:',
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return lastRetry?.created_at || null;
  }

  private async generateVnpayPaymentLink(
    prisma: any,
    options: {
      paymentId: string;
      amountMajor: number;
      description: string;
      ipAddr?: string;
    },
  ): Promise<{ paymentUrl: string; vnpTxnRef: string }> {
    const { paymentId, amountMajor, description, ipAddr } = options;

    const baseRef = paymentId.replace(/-/g, '');
    const txClient =
      prisma && prisma.payments && typeof prisma.payments.findFirst === 'function' ? prisma : null;

    // Try to use the transaction client when available; otherwise fall back to repository helpers
    let existed: any = null;
    if (txClient) {
      existed = await txClient.payments.findFirst({ where: { vnp_txn_ref: baseRef } });
    } else {
      existed = await this._paymentRepository.findByVnpTxnRef(baseRef);
    }

    const vnpTxnRef = existed ? baseRef + Math.floor(Math.random() * 10000) : baseRef;

    // Prefer transaction client update, then PrismaService, then repository helper
    if (txClient && txClient.payments && typeof txClient.payments.update === 'function') {
      await txClient.payments.update({
        where: { payment_id: paymentId },
        data: { vnp_txn_ref: vnpTxnRef },
      });
    } else if (
      this._prismaService &&
      this._prismaService.payments &&
      typeof this._prismaService.payments.update === 'function'
    ) {
      await this._prismaService.payments.update({
        where: { payment_id: paymentId },
        data: { vnp_txn_ref: vnpTxnRef },
      });
    } else if (
      this._paymentRepository &&
      typeof (this._paymentRepository as any).update === 'function'
    ) {
      await (this._paymentRepository as any).update(paymentId, { vnp_txn_ref: vnpTxnRef } as any);
    } else {
      // As a last resort, attempt a direct Prisma call (may fail in tests if Prisma is mocked differently)
      await (this._prismaService as any).payments?.update?.({
        where: { payment_id: paymentId },
        data: { vnp_txn_ref: vnpTxnRef },
      });
    }

    const createDate = new Date();
    const expireDate = new Date(createDate.getTime() + 15 * 60 * 1000);
    const vnp_CreateDate = String(dateFormat(createDate));
    const vnp_ExpireDate = String(dateFormat(expireDate));
    const vnp_OrderInfo = description;

    const amount = Number(amountMajor);

    const vnpParams = {
      vnp_Version: this._config.get<string>('VNP_VERSION') ?? '2.1.0',
      vnp_Command: this._config.get<string>('VNP_COMMAND') ?? 'pay',
      vnp_TmnCode: this._config.getOrThrow<string>('VNP_TMN_CODE'),
      vnp_Amount: toMinor(amount),
      vnp_CurrCode: this._config.get<string>('VNP_CURR_CODE') ?? 'VND',
      vnp_TxnRef: vnpTxnRef,
      vnp_OrderInfo,
      vnp_OrderType: this._config.get<string>('VNP_ORDER_TYPE') ?? ProductCode.Other,
      vnp_ReturnUrl: this._config.getOrThrow<string>('VNP_RETURN_URL'),
      vnp_Locale: (this._config.get('VNP_LOCALE') as any) || VnpLocale.VN,
      vnp_CreateDate: vnp_CreateDate,
      vnp_ExpireDate: vnp_ExpireDate,
      vnp_IpAddr: ipAddr || '127.0.0.1',
    };

    const paymentUrl = this.buildVnpayPaymentUrl(vnpParams);

    this.logger.debug(
      `[VNPay] signedAt_server: ${formatIsoLocal(new Date())} paymentId=${paymentId} vnpTxnRef=${vnpTxnRef}`,
    );

    await prisma.payments.update({
      where: { payment_id: paymentId },
      data: {
        vnp_create_date: BigInt(vnp_CreateDate),
        vnp_expire_date: BigInt(vnp_ExpireDate),
        vnp_order_info: vnp_OrderInfo,
      },
    });

    return { paymentUrl, vnpTxnRef };
  }

  /**
   * Calculate exponential backoff delay in milliseconds
   */
  private calculateBackoffMs(retryCount: number): number {
    // Exponential backoff: 1 hour, 4 hours, 12 hours
    const baseDelayHours = [1, 4, 12];
    return (baseDelayHours[retryCount] || 24) * 60 * 60 * 1000; // Convert to milliseconds
  }

  /**
   * Record a retry attempt for a payment
   */
  private async recordPaymentRetry(paymentId: string): Promise<void> {
    // For now, we'll use cache to track retries
    const cacheKey = `payment_retry_${paymentId}`;
    const currentRetries = parseInt((await this._cacheService.get(cacheKey)) || '0');
    await this._cacheService.set(cacheKey, (currentRetries + 1).toString(), {
      ttl: 7 * 24 * 60 * 60,
    }); // 7 days
  }

  /**
   * Cron job to automatically retry failed payments
   * Runs every 4 hours
   */
  @Cron('0 */4 * * *', { timeZone: 'Asia/Ho_Chi_Minh' })
  async processFailedPaymentRetries() {
    this.logger.log('[CRON] Bắt đầu xử lý retry payments thất bại');

    try {
      // Find failed payments from last 7 days that haven't been retried too many times
      const failedPayments = await this._prismaService.payments.findMany({
        where: {
          status: 'failed',
          created_at: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
        include: {
          user: true,
        },
      });

      this.logger.log(
        `[CRON] Tìm thấy ${failedPayments.length} payments thất bại cần kiểm tra retry`,
      );

      for (const payment of failedPayments) {
        try {
          const retryCount = await this.getPaymentRetryCount(payment.payment_id);
          if (retryCount >= 3) {
            this.logger.log(`[CRON] Payment ${payment.payment_id} đã đạt giới hạn retry, bỏ qua`);
            continue;
          }

          const result = await this.retryFailedPayment(payment.payment_id);
          if (result.success) {
            this.logger.log(`[CRON] ✅ Đã retry thành công payment ${payment.payment_id}`);
          } else {
            this.logger.warn(
              `[CRON] ⚠️ Không thể retry payment ${payment.payment_id}: ${result.message}`,
            );
          }
        } catch (error) {
          this.logger.error(
            `[CRON] ❌ Lỗi khi retry payment ${payment.payment_id}: ${String(
              error instanceof Error ? error.message : error,
            )}`,
          );
        }
      }

      this.logger.log('[CRON] Hoàn thành xử lý retry payments thất bại');
    } catch (error) {
      this.logger.error(
        `[CRON] Lỗi hệ thống khi xử lý retry payments: ${String(
          error instanceof Error ? error.message : error,
        )}`,
      );
    }
  }

  /**
   * Handle successful renewal payment
   */
  private async handleRenewalSuccess(
    prisma: any,
    subscription: any,
    transaction: any,
    periodEnd: Date,
  ) {
    const subscriptionId = subscription.subscription_id;
    const now = new Date();

    // Calculate next period end (keep billing anchor)
    const currentPeriodStart = subscription.current_period_start;
    const currentPeriodEnd = subscription.current_period_end;
    const periodLengthMs = currentPeriodEnd.getTime() - currentPeriodStart.getTime();
    const nextPeriodEnd = new Date(periodEnd.getTime() + periodLengthMs);

    // Update subscription
    await prisma.subscriptions.update({
      where: { subscription_id: subscriptionId },
      data: {
        current_period_end: nextPeriodEnd,
        last_payment_at: now,
        status: 'active',
        // Reset dunning fields
        renewal_attempt_count: 0,
        next_renew_attempt_at: null,
        last_renewal_error: null,
        dunning_stage: 'none',
      },
    });

    // Update transaction status
    await prisma.transactions.update({
      where: { tx_id: transaction.tx_id },
      data: { status: 'paid' },
    });

    // Log renewal event
    if (this._subscriptionEventRepository) {
      await this._subscriptionEventRepository.createIfNotExistsByEventDataInTransaction(
        prisma,
        subscriptionId,
        'renewed',
        'transactionId',
        transaction.tx_id,
        {
          subscription: subscriptionId,
          event_type: 'renewed',
          event_data: {
            transactionId: transaction.tx_id,
            plan: subscription.plan_code,
            amount: transaction.amount_total.toString(),
            period_start: currentPeriodStart.toISOString(),
            period_end: nextPeriodEnd.toISOString(),
            auto_renewed: true,
          },
          created_at: now,
        },
      );
    }

    this.logger.log(
      `[handleRenewalSuccess] Successfully renewed subscription ${subscriptionId} to ${formatIsoLocal(
        nextPeriodEnd,
      )}`,
    );
  }

  /**
   * Handle failed renewal payment - implement dunning logic
   */
  private async handleRenewalFailure(
    prisma: any,
    subscription: any,
    transaction: any,
    error: string,
  ) {
    const subscriptionId = subscription.subscription_id;
    const now = new Date();
    const currentAttempt = (subscription.renewal_attempt_count || 0) + 1;

    // Update transaction status
    await prisma.transactions.update({
      where: { tx_id: transaction.tx_id },
      data: { status: 'failed' },
    });

    // Calculate next retry time based on attempt count
    let nextRetryAt: Date | null = null;
    let dunningStage: string = 'none';
    let newStatus: string = subscription.status;

    if (currentAttempt === 1) {
      // First failure - set past_due and schedule retry in 24 hours
      nextRetryAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      dunningStage = 'retry_1';
      newStatus = 'past_due';
    } else if (currentAttempt === 2) {
      // Second failure - schedule retry in 72 hours
      nextRetryAt = new Date(now.getTime() + 72 * 60 * 60 * 1000);
      dunningStage = 'retry_2';
      newStatus = 'past_due';
    } else {
      // Max retries exceeded - check grace period
      const gracePeriodDays = 5; // 5 days grace period
      const graceExpiry = new Date(
        subscription.current_period_end.getTime() + gracePeriodDays * 24 * 60 * 60 * 1000,
      );

      if (now > graceExpiry) {
        // Grace period expired - mark as expired and schedule downgrade
        newStatus = 'expired';
        dunningStage = 'final';
        nextRetryAt = null;

        // Schedule downgrade to Basic in 5-10 minutes
        await this.scheduleDowngradeToBasicAtPeriodEnd(prisma, {
          ...subscription,
          current_period_end: graceExpiry,
        });
      } else {
        // Still in grace period - no more retries but keep past_due
        dunningStage = 'grace';
        nextRetryAt = null;
      }
    }

    // Update subscription with dunning info
    await prisma.subscriptions.update({
      where: { subscription_id: subscriptionId },
      data: {
        status: newStatus,
        renewal_attempt_count: currentAttempt,
        next_renew_attempt_at: nextRetryAt,
        last_renewal_error: error,
        dunning_stage: dunningStage,
      },
    });

    // Log payment failure event (using expired as closest match)
    if (this._subscriptionEventRepository) {
      await this._subscriptionEventRepository.createIfNotExistsByEventDataInTransaction(
        prisma,
        subscriptionId,
        'expired',
        'transactionId',
        transaction.tx_id,
        {
          subscription: subscriptionId,
          event_type: 'expired',
          event_data: {
            transactionId: transaction.tx_id,
            attempt: currentAttempt,
            error: error,
            dunning_stage: dunningStage,
            next_retry_at: nextRetryAt?.toISOString(),
            payment_failed: true,
          },
          created_at: now,
        },
      );
    }

    this.logger.warn(
      `[handleRenewalFailure] Renewal failed for subscription ${subscriptionId}, attempt ${currentAttempt}, error: ${error}`,
    );
  }

  /**
   * Schedule downgrade to Basic when subscription expires
   */
  private async scheduleDowngradeToBasicAtPeriodEnd(prisma: any, subscription: any) {
    const basicPlan = await prisma.plans.findFirst({
      where: { code: 'basic', is_current: true },
    });
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
        period_start: subscription.current_period_end!,
        period_end: subscription.current_period_end!,
        // Scheduled downgrade should be draft (not a paid transaction)
        status: 'draft' as any,
        effective_action: 'downgrade',
        provider: 'system',
        is_proration: false,
        proration_charge: 0n,
        proration_credit: 0n,
        notes: 'Auto-downgrade to Basic after expiry (no refund)',
      },
    });

    this.logger.log(
      `[scheduleDowngradeToBasicAtPeriodEnd] Scheduled downgrade to Basic for expired subscription ${subscription.subscription_id}`,
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
