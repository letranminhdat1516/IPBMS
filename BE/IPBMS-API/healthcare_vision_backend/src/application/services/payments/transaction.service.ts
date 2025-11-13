import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UnitOfWork } from '../../../infrastructure/database/unit-of-work.service';
import { PlanRepository } from '../../../infrastructure/repositories/admin/plan.repository';
import { SubscriptionRepository } from '../../../infrastructure/repositories/payments/subscription.repository';
import { TransactionRepository } from '../../../infrastructure/repositories/payments/transaction.repository';

@Injectable()
export class TransactionService {
  // Service quản lý các giao dịch thanh toán (transactions).
  // - Chịu trách nhiệm tạo transaction, tra cứu, thống kê, refund và retry.
  // - Sử dụng repositories + unit-of-work để đảm bảo atomic operations khi cần.
  constructor(
    private readonly _transactionRepo: TransactionRepository,
    private readonly _subscriptionRepo: SubscriptionRepository,
    private readonly _planRepo: PlanRepository,
    private readonly _unitOfWork: UnitOfWork,
  ) {}

  /**
   * Tạo transaction mới cho một subscription.
   * - Validate input từ controller.
   * - Lấy subscription và plan (ngoại transaction) và tạo snapshot của plan.
   * - Kiểm tra idempotency key (tránh tạo duplicate khi provider retry).
   * - Kiểm tra overlap kỳ (không cho phép chồng lắp thời gian giữa các transaction open/paid).
   * - Tạo transaction bên trong unit-of-work để đảm bảo atomic.
   */
  async create(data: any) {
    // Validate input
    const {
      subscriptionId,
      planCode,
      action,
      periodStart,
      periodEnd,
      currency,
      amountTotal,
      provider,
      providerPaymentId,
      idempotencyKey,
    } = data;

    if (
      !subscriptionId ||
      !planCode ||
      !action ||
      !periodStart ||
      !periodEnd ||
      !currency ||
      amountTotal === undefined ||
      amountTotal === null
    ) {
      throw new BadRequestException('Missing required fields');
    }

    // Get subscription & plan outside transaction
    const subscription = await this._subscriptionRepo.findBySubscriptionId(subscriptionId, {
      plans: true,
    });
    if (!subscription) throw new NotFoundException('Subscription not found');

    const plan = await this._planRepo.findByCode(planCode);
    if (!plan) throw new NotFoundException('Plan not found');

    // Snapshot current plan and new plan (when upgrading).
    // Replacer dùng khi JSON.stringify để serialize BigInt thành string,
    // tránh lỗi khi có giá trị bigint trong object plan.
    const bigintReplacer = (_: string, value: unknown) =>
      typeof value === 'bigint' ? value.toString() : value;

    let planSnapshot = JSON.parse(JSON.stringify(plan, bigintReplacer));
    let planSnapshotOld: unknown | undefined = undefined;
    let planSnapshotNew: unknown | undefined = undefined;
    if (action === 'upgrade') {
      planSnapshotOld = (subscription as any).plans
        ? JSON.parse(JSON.stringify((subscription as any).plans, bigintReplacer))
        : undefined;
      planSnapshotNew = JSON.parse(JSON.stringify(plan, bigintReplacer));
      planSnapshot = planSnapshotNew || planSnapshotOld || planSnapshot;
    }

    // Helper: chuyển value (number|string|bigint) sang BigInt một cách an toàn.
    // Nếu null/undefined => 0n.
    const toBigInt = (v: number | string | bigint | undefined | null) =>
      BigInt(v == null ? 0 : v.toString());

    return await this._unitOfWork.execute(async (tx) => {
      // Kiểm tra idempotency key (nếu có)
      // Nếu một transaction đã tồn tại với idempotency_key cho cùng subscription,
      // thì trả về transaction đó thay vì tạo mới — tránh duplicate khi provider retry webhook.
      // Check idempotency
      if (idempotencyKey) {
        const existing = await this._transactionRepo.findFirstInTransaction(tx, {
          subscription_id: subscriptionId,
          idempotency_key: idempotencyKey,
        });
        if (existing) return existing;
      }

      // Kiểm tra chồng lắp kỳ (period overlap):
      // Không cho phép tạo transaction mới có khoảng thời gian (period_start, period_end)
      // chồng lắp với một transaction hiện có có trạng thái 'open' hoặc 'paid'.
      // Check period overlap (chống chồng lắp kỳ)
      const overlap = await this._transactionRepo.findFirstInTransaction(tx, {
        subscription_id: subscriptionId,
        status: { in: ['open', 'paid'] as any },
        AND: [
          { period_start: { lt: new Date(periodEnd) } },
          { period_end: { gt: new Date(periodStart) } },
        ],
      });
      if (overlap) throw new ConflictException('Period overlap with existing transaction');

      // Create transaction
      const newTx = await this._transactionRepo.createInTransaction(tx, {
        subscription_id: subscriptionId,
        plan_code: planCode,
        plan_snapshot: planSnapshot,
        plan_snapshot_old: planSnapshotOld,
        plan_snapshot_new: planSnapshotNew,
        amount_subtotal: toBigInt(amountTotal),
        amount_discount: toBigInt(0),
        amount_tax: toBigInt(0),
        amount_total: toBigInt(amountTotal),
        currency,
        period_start: new Date(periodStart),
        period_end: new Date(periodEnd),
        effective_action: action as any,
        status: 'open' as any,
        provider: provider as any,
        provider_payment_id: providerPaymentId,
        idempotency_key: idempotencyKey,
        related_tx_id: null,
        notes: null,
      });

      return newTx;
    });
  }

  // Lấy transaction theo txId; kèm thông tin subscription để kiểm tra quyền nếu cần
  async findById(id: string) {
    return await this._transactionRepo.findByTxId(id, {
      subscriptions: {
        select: {
          user_id: true,
          subscription_id: true,
        },
      },
    });
  }

  // Danh sách transaction theo subscription
  async listBySubscription(subscriptionId: string) {
    return await this._transactionRepo.findBySubscriptionId(subscriptionId);
  }

  // Trả về danh sách transaction kèm paging và filter cơ bản
  async list(
    options: {
      page?: number;
      limit?: number;
      user_id?: string;
      status?: string;
    } = {},
  ) {
    const { page = 1, limit = 20, user_id, status } = options;
    return await this._transactionRepo.findAll({
      page,
      limit,
      user_id,
      status,
    });
  }

  async getStats(options: { period?: string; user_id?: string } = {}) {
    const { period = 'month', user_id } = options;

    // Calculate date range based on period
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

    return await this._transactionRepo.getStatistics(startDate, now, user_id);
  }

  // ========== REFUND METHODS ==========

  // Kiểm tra xem transaction có thể refund hay không
  async checkRefundEligibility(txId: string) {
    const tx = await this._transactionRepo.findByTxId(txId);
    if (!tx) throw new NotFoundException('Transaction not found');

    const refundable =
      (tx.status === 'paid' || (tx.status as any) === 'succeeded') && tx.amount_total > 0;
    const refundableAmount = refundable ? Number(tx.amount_total) : 0;

    // Check if already refunded
    const existingRefund = await this._transactionRepo.findFirst({
      related_tx_id: txId,
      effective_action: 'adjustment',
    });

    return {
      refundable,
      refundableAmount,
      alreadyRefunded: !!existingRefund,
      transaction: tx,
    };
  }

  // Tạo refund transaction (ghi âm trong DB). Thực hiện refund bên provider cần integrate thêm.
  async processRefund(txId: string, options: { amount?: number; reason?: string; notes?: string }) {
    const eligibility = await this.checkRefundEligibility(txId);
    if (!eligibility.refundable) {
      throw new BadRequestException('Transaction is not refundable');
    }
    if (eligibility.alreadyRefunded) {
      throw new BadRequestException('Transaction has already been refunded');
    }

    const refundAmount = options.amount || eligibility.refundableAmount;
    if (refundAmount > eligibility.refundableAmount) {
      throw new BadRequestException('Refund amount exceeds transaction amount');
    }

    return await this._unitOfWork.execute(async (tx) => {
      // Create refund transaction
      const refundTx = await this._transactionRepo.createInTransaction(tx, {
        subscription_id: eligibility.transaction.subscription_id,
        plan_code: eligibility.transaction.plan_code,
        plan_snapshot: eligibility.transaction.plan_snapshot,
        amount_subtotal: BigInt((-refundAmount).toString()),
        amount_discount: BigInt('0'),
        amount_tax: BigInt('0'),
        amount_total: BigInt((-refundAmount).toString()),
        currency: eligibility.transaction.currency,
        period_start: eligibility.transaction.period_start,
        period_end: eligibility.transaction.period_end,
        effective_action: 'adjustment',
        status: 'paid' as any,
        provider: eligibility.transaction.provider,
        provider_payment_id: `refund_${eligibility.transaction.provider_payment_id}`,
        idempotency_key: null,
        related_tx_id: txId,
        notes: options.notes || options.reason,
      });

      return refundTx;
    });
  }

  // ========== FAILED TRANSACTIONS METHODS ==========

  // Lấy danh sách transaction thất bại (void) trong X ngày gần nhất
  async getFailedTransactions(options: { page?: number; limit?: number; days?: number }) {
    const { page = 1, limit = 20, days = 30 } = options;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    return await this._transactionRepo.findAllWithFilters({
      page,
      limit,
      status: 'void' as any,
      createdAfter: startDate,
    });
  }

  // Thử retry một transaction lỗi (placeholder - cần tích hợp provider)
  async retryTransaction(txId: string) {
    const tx = await this._transactionRepo.findByTxId(txId);
    if (!tx) throw new NotFoundException('Transaction not found');
    if (tx.status !== 'void' && (tx.status as any) !== 'failed')
      throw new BadRequestException('Transaction is not in failed state');

    // Logic to retry transaction based on provider
    // This would integrate with payment provider APIs
    return {
      success: false,
      message: 'Retry logic needs to be implemented based on payment provider',
      transaction: tx,
    };
  }

  // ========== REVENUE ANALYTICS METHODS ==========

  // Trả về analytics doanh thu theo khoảng thời gian và groupBy
  async getRevenueAnalytics(options: {
    period?: string;
    startDate?: string;
    endDate?: string;
    groupBy?: string;
  }) {
    const { period = 'month', startDate, endDate, groupBy = 'day' } = options;

    let start: Date;
    let end: Date;

    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      end = new Date();
      switch (period) {
        case 'week':
          start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          start = new Date(end.getFullYear(), end.getMonth(), 1);
          break;
        case 'year':
          start = new Date(end.getFullYear(), 0, 1);
          break;
        default:
          start = new Date(end.getFullYear(), end.getMonth(), 1);
      }
    }

    return await this._transactionRepo.getRevenueAnalytics(start, end, groupBy);
  }

  // Sinh báo cáo doanh thu theo khoảng thời gian. Hiện trả về JSON; CSV/PDF chưa implement
  async generateRevenueReport(options: { startDate: string; endDate: string; format?: string }) {
    const { startDate, endDate, format = 'json' } = options;
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Use ISO strings so getRevenueAnalytics converts them into Dates as expected
    const analytics = await this.getRevenueAnalytics({
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      groupBy: 'day',
    });

    if (format === 'json') {
      return analytics;
    }

    // For other formats, would implement CSV/PDF generation
    return {
      message: 'Report generation for format ' + format + ' not implemented yet',
      data: analytics,
    };
  }
}
