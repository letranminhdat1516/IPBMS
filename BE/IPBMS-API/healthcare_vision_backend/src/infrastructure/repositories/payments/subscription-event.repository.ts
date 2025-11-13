import { Injectable } from '@nestjs/common';
import { Prisma, subscription_event_type_enum, subscription_histories } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { UnitOfWork } from '../../database/unit-of-work.service';
import { BasePrismaRepository } from '../shared/base-prisma.repository';

@Injectable()
export class SubscriptionEventRepository extends BasePrismaRepository {
  constructor(
    protected readonly prismaService: PrismaService,
    protected readonly unitOfWork: UnitOfWork,
  ) {
    super(prismaService, unitOfWork);
  }

  async findBySubscriptionId(
    subscriptionId: string,
    eventType?: subscription_event_type_enum,
  ): Promise<subscription_histories[]> {
    return this.prisma.subscription_histories.findMany({
      where: {
        subscription_id: subscriptionId,
        ...(eventType ? { event_type: eventType } : {}),
      },
      orderBy: { created_at: 'desc' },
    }) as Promise<subscription_histories[]>;
  }

  async findFirstBySubscriptionIdAndType(
    subscriptionId: string,
    eventType: subscription_event_type_enum,
  ): Promise<subscription_histories | null> {
    return this.prisma.subscription_histories.findFirst({
      where: {
        subscription_id: subscriptionId,
        event_type: eventType,
      },
      orderBy: { created_at: 'desc' },
    }) as Promise<subscription_histories | null>;
  }

  async create(data: Prisma.subscription_historiesCreateInput) {
    return this.prisma.subscription_histories.create({ data }) as Promise<subscription_histories>;
  }

  async createInTransaction(
    tx: Prisma.TransactionClient,
    data: Prisma.subscription_historiesCreateInput,
  ) {
    return tx.subscription_histories.create({ data }) as Promise<subscription_histories>;
  }

  async findByEventData(
    subscriptionId: string,
    eventType: subscription_event_type_enum,
    transactionId: string,
  ): Promise<subscription_histories | null> {
    return this.prisma.subscription_histories.findFirst({
      where: {
        subscription_id: subscriptionId,
        event_type: eventType,
        // Prefer scalar lookup by tx_id if present (faster, indexable). Fallback to JSON path for legacy events.
        OR: [
          { tx_id: transactionId },
          {
            event_data: {
              path: ['transactionId'],
              equals: transactionId,
            },
          },
        ],
      },
      orderBy: { created_at: 'desc' },
    }) as Promise<subscription_histories | null>;
  }

  /**
   * Find event by arbitrary JSON path key in event_data (transactionId/paymentId)
   */
  async findByEventDataPath(
    subscriptionId: string,
    eventType: subscription_event_type_enum,
    pathKey: string,
    value: string,
  ): Promise<subscription_histories | null> {
    return this.prisma.subscription_histories.findFirst({
      where: {
        subscription_id: subscriptionId,
        event_type: eventType,
        event_data: {
          path: [pathKey],
          equals: value,
        },
      },
      orderBy: { created_at: 'desc' },
    }) as Promise<subscription_histories | null>;
  }

  /**
   * Helper: find by tx_id scalar
   */
  async findByTxId(
    subscriptionId: string,
    eventType: subscription_event_type_enum,
    txId: string,
  ): Promise<subscription_histories | null> {
    return this.prisma.subscription_histories.findFirst({
      where: {
        subscription_id: subscriptionId,
        event_type: eventType,
        OR: [{ tx_id: txId }, { event_data: { path: ['transactionId'], equals: txId } }],
      },
      orderBy: { created_at: 'desc' },
    }) as Promise<subscription_histories | null>;
  }

  /**
   * Helper: find by payment_id scalar
   */
  async findByPaymentId(
    subscriptionId: string,
    eventType: subscription_event_type_enum,
    paymentId: string,
  ): Promise<subscription_histories | null> {
    return this.prisma.subscription_histories.findFirst({
      where: {
        subscription_id: subscriptionId,
        event_type: eventType,
        OR: [{ payment_id: paymentId }, { event_data: { path: ['paymentId'], equals: paymentId } }],
      },
      orderBy: { created_at: 'desc' },
    }) as Promise<subscription_histories | null>;
  }

  /**
   * Transaction-safe create-if-not-exists by JSON path key.
   * Uses the provided transaction client to ensure atomicity.
   */
  async createIfNotExistsByEventDataInTransaction(
    tx: Prisma.TransactionClient,
    subscriptionId: string,
    eventType: subscription_event_type_enum,
    pathKey: string,
    value: string,
    data: Prisma.subscription_historiesCreateInput,
  ): Promise<subscription_histories | null> {
    // Prefer scalar column lookup if possible (tx_id / payment_id) for atomic and indexed checks.
    let existed = null as any;
    if (pathKey === 'transactionId') {
      existed = await tx.subscription_histories.findFirst({
        where: { subscription_id: subscriptionId, event_type: eventType, tx_id: value },
        orderBy: { created_at: 'desc' },
      });
    } else if (pathKey === 'paymentId') {
      existed = await tx.subscription_histories.findFirst({
        where: {
          subscription_id: subscriptionId,
          event_type: eventType,
          payment_id: value,
        },
        orderBy: { created_at: 'desc' },
      });
    }

    // Fallback to JSON path lookup for legacy events
    if (!existed) {
      existed = await tx.subscription_histories.findFirst({
        where: {
          subscription_id: subscriptionId,
          event_type: eventType,
          event_data: { path: [pathKey], equals: value },
        },
        orderBy: { created_at: 'desc' },
      });
    }

    if (existed) return existed as subscription_histories;

    return tx.subscription_histories.create({ data }) as Promise<subscription_histories>;
  }

  /**
   * Non-transaction variant of create-if-not-exists by JSON path key.
   */
  async createIfNotExistsByEventData(
    subscriptionId: string,
    eventType: subscription_event_type_enum,
    pathKey: string,
    value: string,
    data: Prisma.subscription_historiesCreateInput,
  ): Promise<subscription_histories | null> {
    // Scalar-first lookup
    let existed = null as any;
    if (pathKey === 'transactionId') {
      existed = await this.prisma.subscription_histories.findFirst({
        where: { subscription_id: subscriptionId, event_type: eventType, tx_id: value },
        orderBy: { created_at: 'desc' },
      });
    } else if (pathKey === 'paymentId') {
      existed = await this.prisma.subscription_histories.findFirst({
        where: {
          subscription_id: subscriptionId,
          event_type: eventType,
          payment_id: value,
        },
        orderBy: { created_at: 'desc' },
      });
    }

    if (!existed) {
      // fallback to JSON path
      existed = await this.prisma.subscription_histories.findFirst({
        where: {
          subscription_id: subscriptionId,
          event_type: eventType,
          event_data: { path: [pathKey], equals: value },
        },
        orderBy: { created_at: 'desc' },
      });
    }

    if (existed) return existed as subscription_histories;

    return this.prisma.subscription_histories.create({ data }) as Promise<subscription_histories>;
  }
}
