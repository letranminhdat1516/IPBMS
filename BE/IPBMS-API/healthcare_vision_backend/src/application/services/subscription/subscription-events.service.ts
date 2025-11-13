import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { SubscriptionEventRepository } from '../../../infrastructure/repositories/payments/subscription-event.repository';
import { subscription_histories, subscription_event_type_enum } from '@prisma/client';

@Injectable()
export class SubscriptionEventsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly subscriptionEventRepo: SubscriptionEventRepository,
  ) {}

  async getAllEvents(): Promise<subscription_histories[]> {
    return this.prismaService.subscription_histories.findMany({
      orderBy: { created_at: 'desc' },
    });
  }

  async getEventsBySubscription(subscriptionId: string): Promise<subscription_histories[]> {
    return this.prismaService.subscription_histories.findMany({
      where: { subscription_id: subscriptionId },
      orderBy: { created_at: 'desc' },
    });
  }

  async getEventById(id: bigint): Promise<subscription_histories | null> {
    return this.prismaService.subscription_histories.findUnique({
      where: { id },
    });
  }

  async createEvent(data: {
    subscription_id: string;
    event_type: subscription_event_type_enum;
    event_data?: any;
  }): Promise<subscription_histories> {
    return this.prismaService.subscription_histories.create({
      data,
    });
  }

  /** Create event if not exists by paymentId or transactionId (non-transactional) */
  async createEventIfNotExists(params: {
    subscription_id: string;
    event_type: subscription_event_type_enum;
    byPaymentId?: string;
    byTransactionId?: string;
    event_data?: any;
  }): Promise<subscription_histories> {
    const { subscription_id, event_type, byPaymentId, byTransactionId, event_data } = params;
    if (byTransactionId) {
      const existed = await this.subscriptionEventRepo.findByEventDataPath(
        subscription_id,
        event_type as any,
        'transactionId',
        byTransactionId,
      );
      if (existed) return existed;
      return this.prismaService.subscription_histories.create({
        data: { subscription_id, event_type: event_type as any, event_data },
      });
    }

    if (byPaymentId) {
      const existed = await this.subscriptionEventRepo.findByEventDataPath(
        subscription_id,
        event_type as any,
        'paymentId',
        byPaymentId,
      );
      if (existed) return existed;
      return this.prismaService.subscription_histories.create({
        data: { subscription_id, event_type: event_type as any, event_data },
      });
    }

    return this.prismaService.subscription_histories.create({
      data: { subscription_id, event_type: event_type as any, event_data },
    });
  }

  async getEventsByType(
    eventType: subscription_event_type_enum,
  ): Promise<subscription_histories[]> {
    return this.prismaService.subscription_histories.findMany({
      where: { event_type: eventType },
      orderBy: { created_at: 'desc' },
    });
  }

  async getRecentEvents(limit: number = 50): Promise<subscription_histories[]> {
    return this.prismaService.subscription_histories.findMany({
      orderBy: { created_at: 'desc' },
      take: limit,
    });
  }

  async getEventsInDateRange(startDate: Date, endDate: Date): Promise<subscription_histories[]> {
    return this.prismaService.subscription_histories.findMany({
      where: {
        created_at: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async getSubscriptionLifecycle(subscriptionId: string): Promise<subscription_histories[]> {
    return this.prismaService.subscription_histories.findMany({
      where: { subscription_id: subscriptionId },
      orderBy: { created_at: 'asc' },
    });
  }
}
