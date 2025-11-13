import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UnitOfWork } from '../../database/unit-of-work.service';
import { BasePrismaRepository } from '../shared/base-prisma.repository';
import { Prisma } from '@prisma/client';

@Injectable()
export class SubscriptionRepository extends BasePrismaRepository {
  constructor(
    protected readonly prismaService: PrismaService,
    protected readonly unitOfWork: UnitOfWork,
  ) {
    super(prismaService, unitOfWork);
  }

  async findBySubscriptionId(subscriptionId: string, include?: Prisma.subscriptionsInclude) {
    return this.prisma.subscriptions.findUnique({
      where: { subscription_id: subscriptionId },
      include,
    });
  }

  async findByUserId(userId: string, include?: Prisma.subscriptionsInclude) {
    return this.prisma.subscriptions.findMany({
      where: { user_id: userId },
      include,
    });
  }

  async findActiveByUserId(userId: string, include?: Prisma.subscriptionsInclude) {
    return this.prisma.subscriptions.findFirst({
      where: {
        user_id: userId,
        status: { in: ['trialing', 'active', 'past_due', 'paused'] },
      },
      include,
    });
  }

  async update(subscriptionId: string, data: Prisma.subscriptionsUpdateInput) {
    return this.prisma.subscriptions.update({
      where: { subscription_id: subscriptionId },
      data,
    });
  }

  async updateInTransaction(
    tx: Prisma.TransactionClient,
    subscriptionId: string,
    data: Prisma.subscriptionsUpdateInput,
  ) {
    return tx.subscriptions.update({
      where: { subscription_id: subscriptionId },
      data,
    });
  }

  async findAll(options?: {
    skip?: number;
    take?: number;
    where?: Prisma.subscriptionsWhereInput;
    include?: Prisma.subscriptionsInclude;
    orderBy?: Prisma.subscriptionsOrderByWithRelationInput;
  }) {
    const { skip, take, where, include, orderBy } = options || {};
    return this.prisma.subscriptions.findMany({
      skip,
      take,
      where,
      include,
      orderBy,
    });
  }

  async findBySubscriptionIdInTransaction(
    tx: Prisma.TransactionClient,
    subscriptionId: string,
    include?: Prisma.subscriptionsInclude,
  ) {
    return tx.subscriptions.findUnique({
      where: { subscription_id: subscriptionId },
      include,
    });
  }
}
