import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { EventsService } from '../../application/services/events.service';
import { CaregiversService } from '../../application/services/caregivers.service';
import { EventStatusEnum } from '../../core/entities/events.entity';

export interface SearchFilters {
  query?: string;
  dateFrom?: Date;
  dateTo?: Date;
  status?: string;
  confidenceMin?: number;
  confidenceMax?: number;
  eventType?: string;
  userId?: string;
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  id: string;
  type: 'event' | 'caregiver' | 'invoice';
  title: string;
  description: string;
  status: string;
  date: Date;
  confidence?: number;
  metadata: Record<string, any>;
}

export interface SearchHistory {
  id: string;
  userId: string;
  query: string;
  filters: SearchFilters;
  resultCount: number;
  searchedAt: Date;
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly _prisma: PrismaService,
    private readonly _eventsService: EventsService,
    private readonly _caregiversService: CaregiversService,
  ) {}

  async unifiedSearch(filters: SearchFilters): Promise<{
    results: SearchResult[];
    total: number;
    hasMore: boolean;
  }> {
    const {
      query,
      dateFrom,
      dateTo,
      status,
      confidenceMin,
      confidenceMax,
      eventType,
      userId,
      limit = 20,
      offset = 0,
    } = filters;

    const results: SearchResult[] = [];
    let total = 0;

    // Search events
    if (!eventType || eventType === 'event') {
      const events = await this._prisma.events.findMany({
        where: {
          ...(query && {
            OR: [
              { event_description: { contains: query, mode: 'insensitive' } },
              { notes: { contains: query, mode: 'insensitive' } },
            ],
          }),
          ...((dateFrom || dateTo) && {
            detected_at: {
              ...(dateFrom && { gte: dateFrom }),
              ...(dateTo && { lte: dateTo }),
            },
          }),
          ...(status && { status: status as any }),
          ...((confidenceMin !== undefined || confidenceMax !== undefined) && {
            confidence_score: {
              ...(confidenceMin !== undefined && { gte: confidenceMin }),
              ...(confidenceMax !== undefined && { lte: confidenceMax }),
            },
          }),
          ...(userId && { user_id: userId }),
        },
        include: {
          cameras: {
            select: { camera_name: true },
          },
          user: {
            select: { full_name: true, email: true },
          },
        },
        orderBy: { detected_at: 'desc' },
        take: limit,
        skip: offset,
      });

      const eventResults: SearchResult[] = events.map((event) => ({
        id: event.event_id,
        type: 'event',
        title: `${event.event_type} Detection`,
        description: event.event_description || 'Event detected',
        status: event.status || 'pending',
        date: event.detected_at,
        confidence: event.confidence_score ? Number(event.confidence_score) : undefined,
        metadata: {
          cameraName: event.cameras.camera_name,
          userName: event.user.full_name,
          eventType: event.event_type,
        },
      }));

      results.push(...eventResults);
      total += events.length;
    }

    // Search caregivers (users with caregiver role)
    if (!eventType || eventType === 'caregiver') {
      const caregivers = await this._prisma.users.findMany({
        where: {
          role: 'caregiver',
          is_active: true,
          ...(query && {
            OR: [
              { full_name: { contains: query, mode: 'insensitive' } },
              { email: { contains: query, mode: 'insensitive' } },
              { username: { contains: query, mode: 'insensitive' } },
            ],
          }),
          ...((dateFrom || dateTo) && {
            created_at: {
              ...(dateFrom && { gte: dateFrom }),
              ...(dateTo && { lte: dateTo }),
            },
          }),
        },
        select: {
          user_id: true,
          full_name: true,
          email: true,
          phone_number: true,
          created_at: true,
        },
        orderBy: { created_at: 'desc' },
        take: limit - results.length,
        skip: offset,
      });

      const caregiverResults: SearchResult[] = caregivers.map((caregiver) => ({
        id: caregiver.user_id,
        type: 'caregiver',
        title: caregiver.full_name,
        description: `Caregiver - ${caregiver.email}`,
        status: 'active',
        date: caregiver.created_at,
        metadata: {
          email: caregiver.email,
          phone: caregiver.phone_number,
        },
      }));

      results.push(...caregiverResults);
      total += caregivers.length;
    }

    // Search transactions (invoices)
    if (!eventType || eventType === 'invoice') {
      const transactions = await this._prisma.transactions.findMany({
        where: {
          ...(query && {
            OR: [
              { notes: { contains: query, mode: 'insensitive' } },
              { plan_code: { contains: query, mode: 'insensitive' } },
            ],
          }),
          ...((dateFrom || dateTo) && {
            created_at: {
              ...(dateFrom && { gte: dateFrom }),
              ...(dateTo && { lte: dateTo }),
            },
          }),
          ...(status && { status: status as any }),
          ...(userId && {
            subscriptions: {
              user_id: userId,
            },
          }),
        },
        include: {
          subscriptions: {
            include: {
              users: {
                select: { full_name: true, email: true },
              },
            },
          },
          plans: {
            select: { name: true, code: true },
          },
        },
        orderBy: { created_at: 'desc' },
        take: limit - results.length,
        skip: offset,
      });

      const invoiceResults: SearchResult[] = transactions.map((transaction) => ({
        id: transaction.tx_id,
        type: 'invoice',
        title: `Invoice - ${transaction.plans?.name || transaction.plan_code}`,
        description: `Amount: ${(Number(transaction.amount_total) / 100).toFixed(2)} ${transaction.currency}`,
        status: transaction.status,
        date: transaction.created_at,
        metadata: {
          amount: Number(transaction.amount_total),
          currency: transaction.currency,
          planName: transaction.plans?.name,
          userName: transaction.subscriptions.users.full_name,
          periodStart: transaction.period_start,
          periodEnd: transaction.period_end,
        },
      }));

      results.push(...invoiceResults);
      total += transactions.length;
    }

    // Sort all results by date
    results.sort((a, b) => b.date.getTime() - a.date.getTime());

    // Limit total results
    const limitedResults = results.slice(0, limit);
    const hasMore = results.length > limit;

    return {
      results: limitedResults,
      total: total,
      hasMore,
    };
  }

  async saveSearchHistory(
    _userId: string,
    _filters: SearchFilters,
    _resultCount: number,
  ): Promise<void> {
    // TODO: Implement search_history table in schema
    return;
    // try {
    //   await this._prisma.search_history.create({
    //     data: {
    //       user_id: userId,
    //       query: filters.query || '',
    //       filters: filters as any,
    //       result_count: resultCount,
    //     },
    //   });
    //   this.logger.log(`Saved search history for user ${userId}`);
    // } catch (error) {
    //   this.logger.error(`Failed to save search history for user ${userId}:`, error);
    //   // Don't throw error to avoid breaking search functionality
    // }
  }

  async getSearchHistory(_userId: string, _limit = 10): Promise<SearchHistory[]> {
    // TODO: Implement search_history table in schema
    return [];
    // try {
    //   const history = await this._prisma.search_history.findMany({
    //     where: { user_id: userId },
    //     orderBy: { searched_at: 'desc' },
    //     take: limit,
    //   });

    //   return history.map((item) => ({
    //     id: item.id,
    //     userId: item.user_id,
    //     query: item.query || '',
    //     filters: item.filters as SearchFilters,
    //     resultCount: item.result_count,
    //     searchedAt: item.searched_at,
    //   }));
    // } catch (error) {
    //   this.logger.error(`Failed to get search history for user ${userId}:`, error);
    //   return [];
    // }
  }

  async performQuickAction(action: string, entityId: string, userId: string): Promise<boolean> {
    try {
      switch (action) {
        case 'mark_event_processed':
          await this._eventsService.updateStatus(entityId, EventStatusEnum.normal, userId);
          return true;

        case 'pay_invoice':
          // This would integrate with payment service
          this.logger.log(`Payment requested for invoice ${entityId} by user ${userId}`);
          return true;

        case 'view_details':
          // This is just a navigation action, always return true
          return true;

        default:
          return false;
      }
    } catch (error) {
      this.logger.error(`Failed to perform quick action ${action} on ${entityId}`, error);
      return false;
    }
  }
}
