import { Injectable } from '@nestjs/common';
import { Prisma, payment_status_enum } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { UnitOfWork } from '../../database/unit-of-work.service';
import { BasePrismaRepository } from '../shared/base-prisma.repository';

@Injectable()
export class PaymentRepository extends BasePrismaRepository {
  constructor(
    protected readonly prismaService: PrismaService,
    protected readonly unitOfWork: UnitOfWork,
  ) {
    super(prismaService, unitOfWork);
  }

  async findByPaymentId(paymentId: string, include?: Prisma.paymentsInclude) {
    return this.prisma.payments.findUnique({
      where: { payment_id: paymentId },
      include,
    });
  }

  async findByVnpTxnRef(vnp_txn_ref: string) {
    return this.prisma.payments.findFirst({
      where: { vnp_txn_ref },
    });
  }

  async create(data: Prisma.paymentsCreateInput) {
    return this.prisma.payments.create({
      data,
    });
  }

  async createInTransaction(tx: Prisma.TransactionClient, data: Prisma.paymentsCreateInput) {
    return tx.payments.create({
      data,
    });
  }

  async update(paymentId: string, data: Prisma.paymentsUpdateInput) {
    return this.prisma.payments.update({
      where: { payment_id: paymentId },
      data,
    });
  }

  async updateInTransaction(
    tx: Prisma.TransactionClient,
    paymentId: string,
    data: Prisma.paymentsUpdateInput,
  ) {
    return tx.payments.update({
      where: { payment_id: paymentId },
      data,
    });
  }

  // Plan operations
  /**
   * Find the current active version of a plan by its code
   *
   * @param code - The plan code to search for (case-insensitive)
   * @returns The current active plan with the given code, or null if not found
   *
   * Compound key handling: Uses code + is_current filter to get the active version
   * since multiple versions of the same plan code can exist with @@unique([code, version])
   */
  async findPlanByCode(code: string) {
    return this.prisma.plans.findFirst({
      where: { code: code.toLowerCase(), is_current: true },
    });
  }

  // Subscription operations
  async findActiveSubscriptionByUserId(user_id: string) {
    return this.prisma.subscriptions.findFirst({
      where: {
        user_id,
        status: 'active',
      },
      include: {
        plans: true,
      },
    });
  }

  async findActiveSubscriptionByUserIdInTransaction(tx: Prisma.TransactionClient, user_id: string) {
    return tx.subscriptions.findFirst({
      where: {
        user_id,
        status: 'active',
      },
      include: {
        plans: true,
      },
    });
  }

  async createSubscription(data: Prisma.subscriptionsCreateInput) {
    return this.prisma.subscriptions.create({
      data,
    });
  }

  async createSubscriptionInTransaction(
    tx: Prisma.TransactionClient,
    data: Prisma.subscriptionsCreateInput,
  ) {
    return tx.subscriptions.create({
      data,
    });
  }

  async updateSubscription(subscription_id: string, data: Prisma.subscriptionsUpdateInput) {
    return this.prisma.subscriptions.update({
      where: { subscription_id },
      data,
    });
  }

  async updateSubscriptionInTransaction(
    tx: Prisma.TransactionClient,
    subscription_id: string,
    data: Prisma.subscriptionsUpdateInput,
  ) {
    return tx.subscriptions.update({
      where: { subscription_id },
      data,
    });
  }

  // Transaction operations
  async createTransaction(data: Prisma.transactionsCreateInput) {
    return this.prisma.transactions.create({
      data,
    });
  }

  async createTransactionInTransaction(
    tx: Prisma.TransactionClient,
    data: Prisma.transactionsCreateInput,
  ) {
    return tx.transactions.create({
      data,
    });
  }

  // Complex payment transaction
  async executePaymentTransaction<T>(
    callback: (_tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction<T>(callback as any);
  }

  async updatePaymentStatus(paymentId: string, status: string) {
    return await this.prisma.payments.update({
      where: { payment_id: paymentId },
      data: { status, status_enum: this.mapStatusToEnum(status) },
    });
  }

  private mapStatusToEnum(status: string): payment_status_enum | null {
    switch ((status || '').toLowerCase()) {
      case 'pending':
        return 'pending';
      case 'processing':
        return 'processing';
      case 'paid':
        return 'completed';
      case 'completed':
        return 'completed';
      case 'failed':
        return 'failed';
      // 'refunded' status intentionally unsupported at payment level (no wallet handling)
      case 'canceled':
      case 'cancelled':
        return 'cancelled';
      default:
        return null;
    }
  }

  async findPayments(userId?: string, planCode?: string) {
    const where: any = {};
    if (userId) where.user_id = userId;
    // payment.plan_code was migrated to delivery_data.plan_code
    if (planCode) where.delivery_data = { path: ['plan_code'], equals: planCode };

    return await this.prisma.payments.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: {
        user: true,
      },
    });
  }

  async findTransactionByPaymentId(paymentId: string) {
    // Prefer explicit transactions.payment_id (new 1-1 mapping). Fall back to provider_payment_id for legacy rows.
    return await this.prisma.transactions.findFirst({
      where: {
        OR: [{ payment_id: paymentId }, { provider_payment_id: paymentId }],
      },
      include: {
        subscriptions: {
          include: { plans: true },
        },
        plans: true,
      },
    });
  }

  // Raw queries for complex operations
  async findExistingSubscription(user_id: string) {
    const result = await this.prisma.$queryRaw<
      Array<{
        subscription_id: string;
        plan_id: string;
        status: string;
        started_at: Date;
        expires_at: Date | null;
        is_lifetime: boolean;
      }>
    >`
      SELECT subscription_id, plan_id, status, started_at, expires_at, is_lifetime
      FROM subscriptions 
      WHERE user_id = ${user_id} AND status = 'active'
      ORDER BY started_at DESC 
      LIMIT 1
    `;
    return result[0] || null;
  }

  async updateSubscriptionStatus(user_id: string, status: 'inactive' | 'expired') {
    await this.prisma.$executeRaw`
      UPDATE subscriptions 
      SET status = ${status}, ended_at = NOW()
      WHERE user_id = ${user_id} AND status = 'active'
    `;
  }

  async getPaymentsByUserId(user_id: string, limit: number = 10) {
    return this.prisma.payments.findMany({
      where: { user_id },
      orderBy: { created_at: 'desc' },
      take: limit,
    });
  }

  async getTransactionsByUserId(user_id: string, limit: number = 10) {
    return this.prisma.transactions.findMany({
      where: {
        subscriptions: {
          user_id: user_id,
        },
      },
      orderBy: { created_at: 'desc' },
      take: limit,
      include: {
        subscriptions: {
          include: {
            plans: true,
          },
        },
      },
    });
  }

  // Method for subscription service
  async findByPaymentIdOrTxnRef(params: {
    paymentId: string;
    vnpTxnRef: string;
    vnpTxnRefAlt: string;
  }) {
    return this.prisma.payments.findFirst({
      where: {
        OR: [
          { payment_id: params.paymentId },
          { vnp_txn_ref: params.vnpTxnRef },
          { vnp_txn_ref: params.vnpTxnRefAlt },
        ],
      },
      include: {
        user: true,
      },
    });
  }
}
