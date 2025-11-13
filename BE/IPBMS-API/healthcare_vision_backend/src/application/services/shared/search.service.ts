import { Injectable, Logger } from '@nestjs/common';
import { EventStatusEnum } from '../../../core/entities/events.entity';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { CaregiversService } from '../users/caregivers.service';
import { EventsService } from '../events/events.service';

export interface SearchFilters {
  keyword?: string;
  type?: 'events' | 'caregivers' | 'invoices' | 'all';
  dateFrom?: string;
  dateTo?: string;
  status?: string[];
  confidenceMin?: number;
  page?: number;
  limit?: number;
  userId?: string;
}

export interface SearchResult {
  id: string;
  type: 'event' | 'caregiver' | 'invoice';
  title: string;
  description: string;
  status: string;
  confidence?: number;
  created_at: Date;
  metadata: Record<string, any>;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  limit: number;
  filters: SearchFilters;
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

  async search(filters: SearchFilters): Promise<SearchResponse> {
    const { type = 'all', page = 1, limit = 20 } = filters;
    const results: SearchResult[] = [];

    try {
      // Search based on type
      if (type === 'all' || type === 'events') {
        const eventResults = await this.searchEvents(filters);
        results.push(...eventResults);
      }

      if (type === 'all' || type === 'caregivers') {
        const caregiverResults = await this.searchCaregivers(filters);
        results.push(...caregiverResults);
      }

      if (type === 'all' || type === 'invoices') {
        const invoiceResults = await this.searchInvoices(filters);
        results.push(...invoiceResults);
      }

      // Sort by relevance and date
      results.sort((a, b) => {
        // Prioritize by confidence if available
        if (a.confidence && b.confidence) {
          return b.confidence - a.confidence;
        }
        // Then by creation date
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      // Apply pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedResults = results.slice(startIndex, endIndex);

      return {
        results: paginatedResults,
        total: results.length,
        page,
        limit,
        filters,
      };
    } catch (error) {
      this.logger.error('Search failed', error);
      throw error;
    }
  }

  private async searchEvents(filters: SearchFilters): Promise<SearchResult[]> {
    const { keyword, dateFrom, dateTo, status, confidenceMin, userId } = filters;

    const where: any = {};

    // Add user access control
    if (userId) {
      where.OR = [{ user_id: userId }, { cameras: { customer_id: userId } }];
    }

    // Keyword search
    if (keyword) {
      where.OR = where.OR || [];
      where.OR.push(
        { event_type: { contains: keyword, mode: 'insensitive' } },
        { description: { contains: keyword, mode: 'insensitive' } },
        { cameras: { name: { contains: keyword, mode: 'insensitive' } } },
      );
    }

    // Date range
    if (dateFrom || dateTo) {
      where.detected_at = {};
      if (dateFrom) where.detected_at.gte = new Date(dateFrom);
      if (dateTo) where.detected_at.lte = new Date(dateTo);
    }

    // Status filter
    if (status && status.length > 0) {
      where.status = { in: status };
    }

    // Confidence filter
    if (confidenceMin !== undefined) {
      where.confidence_score = { gte: confidenceMin };
    }

    const events = await this._prisma.events.findMany({
      where,
      include: {
        cameras: true,
      },
      orderBy: {
        detected_at: 'desc',
      },
    });

    return events.map((event) => ({
      id: event.event_id,
      type: 'event' as const,
      title: `${event.event_type} - ${event.cameras?.camera_name || 'Unknown Camera'}`,
      description: event.event_description || 'Event detected',
      status: event.status || 'pending',
      confidence: event.confidence_score ? Number(event.confidence_score) : undefined,
      created_at: event.detected_at,
      metadata: {
        camera_id: event.camera_id,
        camera_name: event.cameras?.camera_name,
        event_type: event.event_type,
      },
    }));
  }

  private async searchCaregivers(filters: SearchFilters): Promise<SearchResult[]> {
    const { keyword, status } = filters;

    const where: any = {
      role: 'caregiver',
    };

    // Keyword search
    if (keyword) {
      where.OR = [
        { username: { contains: keyword, mode: 'insensitive' } },
        { full_name: { contains: keyword, mode: 'insensitive' } },
        { email: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    // Status filter (active/inactive)
    if (status && status.length > 0) {
      if (status.includes('active')) {
        where.is_active = true;
      }
      if (status.includes('inactive')) {
        where.is_active = false;
      }
    }

    const caregivers = await this._prisma.users.findMany({
      where,
      orderBy: {
        created_at: 'desc',
      },
    });

    return caregivers.map((caregiver) => ({
      id: caregiver.user_id,
      type: 'caregiver' as const,
      title: caregiver.full_name || caregiver.username,
      description: `Email: ${caregiver.email}`,
      status: caregiver.is_active ? 'active' : 'inactive',
      created_at: caregiver.created_at,
      metadata: {
        email: caregiver.email,
        username: caregiver.username,
        phone: caregiver.phone_number,
      },
    }));
  }

  private async searchInvoices(filters: SearchFilters): Promise<SearchResult[]> {
    const { keyword, dateFrom, dateTo, status, userId } = filters;

    const where: any = {};

    // User access control
    if (userId) {
      where.user_id = userId;
    }

    // Keyword search
    if (keyword) {
      where.OR = [
        { invoice_id: { contains: keyword } },
        { users: { full_name: { contains: keyword, mode: 'insensitive' } } },
        { total_amount: { equals: parseFloat(keyword) || undefined } },
      ].filter(Boolean);
    }

    // Date range
    if (dateFrom || dateTo) {
      where.issued_at = {};
      if (dateFrom) where.issued_at.gte = new Date(dateFrom);
      if (dateTo) where.issued_at.lte = new Date(dateTo);
    }

    // Status filter
    if (status && status.length > 0) {
      where.status = { in: status };
    }

    // For now, we'll use transactions table as invoices
    // This should be updated when proper invoice entity is created
    const invoices = await this._prisma.transactions.findMany({
      where,
      include: {
        subscriptions: {
          include: {
            users: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return invoices.map((invoice) => ({
      id: invoice.tx_id,
      type: 'invoice' as const,
      title: `Invoice #${invoice.tx_id}`,
      description: `Amount: ${(Number(invoice.amount_total) / 100).toFixed(2)} ${invoice.currency}`,
      status: invoice.status || 'pending',
      created_at: invoice.created_at,
      metadata: {
        total_amount: Number(invoice.amount_total),
        currency: invoice.currency,
        user_name: invoice.subscriptions?.users?.full_name,
        payment_id: invoice.tx_id,
      },
    }));
  }

  // Search history functionality (database-backed)
  async saveSearchHistory(
    _userId: string,
    _filters: SearchFilters,
    _resultCount: number,
  ): Promise<void> {
    // TODO: Implement search_history table in schema
    return;
    // try {
    //   await this.prisma.search_history.create({
    //     data: {
    //       user_id: userId,
    //       query: filters.keyword || '',
    //       filters: filters as any,
    //       result_count: resultCount,
    //     },
    //   });
    //   this.logger.log(`Search history feature not yet implemented for user ${userId}`);
    // } catch (error) {
    //   this.logger.error(`Failed to save search history for user ${userId}:`, error);
    //   // Don't throw error to avoid breaking search functionality
    // }
  }

  async getSearchHistory(_userId: string, _limit = 10): Promise<SearchHistory[]> {
    // TODO: Implement search_history table in schema
    return [];
    // try {
    //   const history = await this.prisma.search_history.findMany({
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

  async clearSearchHistory(_userId: string): Promise<void> {
    // TODO: Implement search_history table in schema
    return;
    // try {
    //   await this.prisma.search_history.deleteMany({
    //     where: { user_id: userId },
    //   });
    //   this.logger.log(`Cleared search history for user ${userId}`);
    // } catch (error) {
    //   this.logger.error(`Failed to clear search history for user ${userId}:`, error);
    // }
  }

  // Quick actions
  async markEventAsProcessed(eventId: string, _userId: string): Promise<void> {
    await this._eventsService.updateStatus(eventId, EventStatusEnum.normal);
  }

  async getInvoicePaymentUrl(_invoiceId: string, _userId: string): Promise<string> {
    // This would integrate with payment service to generate payment URL
    // For now, return a placeholder
    return `payment://invoice/${_invoiceId}`;
  }
}
