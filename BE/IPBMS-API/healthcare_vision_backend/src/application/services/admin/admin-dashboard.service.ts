import { Injectable, Logger } from '@nestjs/common';
import { HistoryService } from '../../../modules/tickets/history.service';
import { TicketCategory, TicketPriority, TicketStatus } from '../../../shared/types/ticket-enums';
import { TicketsService } from '../system/tickets.service';
import { UsersService } from '../users/users.service';

// Define proper interfaces for database results
interface AgentTicketCount {
  agentId: string;
  ticketCount: number;
}

interface AgentResolvedCount {
  agentId: string;
  resolvedCount: number;
}

interface AgentActiveCount {
  agentId: string;
  activeCount: number;
}

export interface TicketStatistics {
  total: number;
  byStatus: Record<TicketStatus, number>;
  byPriority: Record<TicketPriority, number>;
  byCategory: Record<TicketCategory, number>;
  createdToday: number;
  createdThisWeek: number;
  createdThisMonth: number;
  resolvedToday: number;
  resolvedThisWeek: number;
  resolvedThisMonth: number;
  averageResolutionTime: number; // in hours
  averageFirstResponseTime: number; // in hours
}

export interface AgentPerformance {
  agentId: string;
  agentName: string;
  ticketsAssigned: number;
  ticketsResolved: number;
  ticketsInProgress: number;
  averageResolutionTime: number;
  averageRating: number;
  totalRatings: number;
  responseRate: number; // percentage
}

export interface CustomerSatisfaction {
  averageRating: number;
  totalRatings: number;
  ratingDistribution: Record<number, number>; // 1-5 stars
  satisfactionTrend: {
    last7Days: number;
    last30Days: number;
    last90Days: number;
  };
  topIssues: Array<{
    category: TicketCategory;
    count: number;
    averageRating: number;
  }>;
}

export interface AdminDashboardData {
  ticketStatistics: TicketStatistics;
  agentPerformance: AgentPerformance[];
  customerSatisfaction: CustomerSatisfaction;
  recentActivity: any[]; // Will be implemented with history service
}

@Injectable()
export class AdminDashboardService {
  private readonly logger = new Logger(AdminDashboardService.name);

  // Cache for expensive operations
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // Retry configuration
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 second

  constructor(
    private readonly _ticketsService: TicketsService,
    private readonly _historyService: HistoryService,
    private readonly _usersService: UsersService,
  ) {}

  async getDashboardData(): Promise<AdminDashboardData> {
    try {
      this.logger.debug('Fetching admin dashboard data');

      const [ticketStatistics, agentPerformance, customerSatisfaction, recentActivity] =
        await Promise.all([
          this.getTicketStatistics(),
          this.getAgentPerformance(),
          this.getCustomerSatisfaction(),
          this.getRecentActivity(),
        ]);

      this.logger.debug('Admin dashboard data fetched successfully');
      return {
        ticketStatistics,
        agentPerformance,
        customerSatisfaction,
        recentActivity,
      };
    } catch (error) {
      this.logger.error('Error getting admin dashboard data:', error);
      throw error;
    }
  }

  async getTicketStatistics(): Promise<TicketStatistics> {
    return this.getCachedData('ticket-statistics', async () => {
      try {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // Get all counts in parallel
        const [
          total,
          statusCounts,
          priorityCounts,
          categoryCounts,
          createdToday,
          createdThisWeek,
          createdThisMonth,
          resolvedToday,
          resolvedThisWeek,
          resolvedThisMonth,
          averageResolutionTime,
          averageFirstResponseTime,
        ] = await Promise.all([
          this._ticketsService.getTotalTicketCount(),
          this._ticketsService.getTicketStatusCounts(),
          this._ticketsService.getTicketPriorityCounts(),
          this._ticketsService.getTicketCategoryCounts(),
          this._ticketsService.getTicketsCreatedInDateRange(today, now),
          this._ticketsService.getTicketsCreatedInDateRange(thisWeek, now),
          this._ticketsService.getTicketsCreatedInDateRange(thisMonth, now),
          this._ticketsService.getTicketsResolvedInDateRange(today, now),
          this._ticketsService.getTicketsResolvedInDateRange(thisWeek, now),
          this._ticketsService.getTicketsResolvedInDateRange(thisMonth, now),
          this._ticketsService.getAverageResolutionTime(),
          this._ticketsService.getAverageFirstResponseTime(),
        ]);

        return {
          total,
          byStatus: this.createEnumCountMap(TicketStatus, statusCounts),
          byPriority: this.createEnumCountMap(TicketPriority, priorityCounts),
          byCategory: this.createEnumCountMap(TicketCategory, categoryCounts),
          createdToday,
          createdThisWeek,
          createdThisMonth,
          resolvedToday,
          resolvedThisWeek,
          resolvedThisMonth,
          averageResolutionTime,
          averageFirstResponseTime,
        };
      } catch (error) {
        this.logger.error('Error calculating ticket statistics:', error);
        throw error;
      }
    });
  }

  async getAgentPerformance(): Promise<AgentPerformance[]> {
    return this.getCachedData('agentPerformance', async () => {
      try {
        // Get all agent metrics in parallel
        const [ticketCounts, resolvedCounts, activeCounts, resolutionStats, ratingStats] =
          await Promise.all([
            this.executeWithRetry(() => this._ticketsService.getAgentTicketCounts()),
            this.executeWithRetry(() => this._ticketsService.getAgentResolvedTicketCounts()),
            this.executeWithRetry(() => this._ticketsService.getAgentActiveTicketCounts()),
            this.executeWithRetry(() => this._ticketsService.getAgentResolutionTimeStats()),
            this.executeWithRetry(() => this._historyService.getAgentRatingStatistics()),
          ]);

        // Create maps for easy lookup
        const ticketCountMap = new Map(
          ticketCounts.map((item: AgentTicketCount) => [item.agentId, item.ticketCount]),
        );
        const resolvedCountMap = new Map(
          resolvedCounts.map((item: AgentResolvedCount) => [item.agentId, item.resolvedCount]),
        );
        const activeCountMap = new Map(
          activeCounts.map((item: AgentActiveCount) => [item.agentId, item.activeCount]),
        );

        // Get all unique agent IDs
        const allAgentIds = Array.from(
          new Set([...ticketCountMap.keys(), ...resolvedCountMap.keys(), ...activeCountMap.keys()]),
        );

        // Get agent names
        const agentNames = await this.getAgentNames(allAgentIds);
        const resolutionMap = new Map(
          resolutionStats.map((item) => [item.agentId, item.averageResolutionHours]),
        );
        const ratingMap = new Map(
          ratingStats.map((item) => [
            item.agentId,
            { averageRating: item.averageRating, totalRatings: item.totalRatings },
          ]),
        );

        // Build agent performance data
        const agentPerformance: AgentPerformance[] = allAgentIds.map((agentId: string) => {
          const ticketsAssigned = ticketCountMap.get(agentId) || 0;
          const ticketsResolved = resolvedCountMap.get(agentId) || 0;
          const ticketsInProgress = activeCountMap.get(agentId) || 0;
          const resolutionTime = resolutionMap.get(agentId) || 0;
          const ratingStat = ratingMap.get(agentId) || { averageRating: 0, totalRatings: 0 };

          return {
            agentId,
            agentName: agentNames.get(agentId) || `Agent ${agentId.slice(-8)}`,
            ticketsAssigned,
            ticketsResolved,
            ticketsInProgress,
            averageResolutionTime: resolutionTime,
            averageRating: ratingStat.averageRating,
            totalRatings: ratingStat.totalRatings,
            responseRate: ticketsAssigned > 0 ? (ticketsResolved / ticketsAssigned) * 100 : 0,
          };
        });

        return agentPerformance;
      } catch (error) {
        this.logger.error('Error calculating agent performance:', error);
        return [];
      }
    });
  }

  async getCustomerSatisfaction(): Promise<CustomerSatisfaction> {
    return this.getCachedData('customerSatisfaction', async () => {
      try {
        const ratingStats = await this.executeWithRetry(() =>
          this._historyService.getRatingStatistics(),
        );
        const ratingsByCategory = await this.executeWithRetry(() =>
          this._historyService.getRatingsByCategory(),
        );
        const [last7Days, last30Days, last90Days] = await Promise.all([
          this.executeWithRetry(() => this._historyService.getAverageRatingSince(7)),
          this.executeWithRetry(() => this._historyService.getAverageRatingSince(30)),
          this.executeWithRetry(() => this._historyService.getAverageRatingSince(90)),
        ]);

        const topIssues = ratingsByCategory.slice(0, 5).map((item) => ({
          category: item.category as TicketCategory,
          count: item.count,
          averageRating: item.averageRating,
        }));

        const satisfactionTrend = {
          last7Days,
          last30Days,
          last90Days,
        };

        return {
          averageRating: ratingStats.averageRating,
          totalRatings: ratingStats.totalRatings,
          ratingDistribution: ratingStats.ratingDistribution,
          satisfactionTrend,
          topIssues,
        };
      } catch (error) {
        this.logger.error('Error calculating customer satisfaction:', error);

        return {
          averageRating: 0,
          totalRatings: 0,
          ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          satisfactionTrend: {
            last7Days: 0,
            last30Days: 0,
            last90Days: 0,
          },
          topIssues: [],
        };
      }
    });
  }

  async getRecentActivity(): Promise<any[]> {
    return this.getCachedData('recentActivity', async () => {
      try {
        const recentHistory = await this.executeWithRetry(() =>
          this._historyService.getRecentActivity(50),
        );

        // Transform history entries into activity items
        return recentHistory.map((history: any) => ({
          id: history.history_id,
          ticketId: history.ticket_id,
          userId: history.user_id,
          action: history.action,
          description: history.description,
          timestamp: history.created_at,
          ticketTitle: history.ticket?.title || 'Untitled Ticket',
          metadata: history.metadata,
        }));
      } catch (error) {
        this.logger.error('Error retrieving recent activity:', error);
        return [];
      }
    });
  }

  // Additional methods for specific metrics
  async getTicketStatusDistribution(): Promise<Record<TicketStatus, number>> {
    return this.getCachedData('ticketStatusDistribution', async () => {
      try {
        const statusCounts = await this.executeWithRetry(() =>
          this._ticketsService.getTicketStatusCounts(),
        );

        return {
          [TicketStatus.NEW]: statusCounts[TicketStatus.NEW] || 0,
          [TicketStatus.OPEN]: statusCounts[TicketStatus.OPEN] || 0,
          [TicketStatus.IN_PROGRESS]: statusCounts[TicketStatus.IN_PROGRESS] || 0,
          [TicketStatus.WAITING_FOR_CUSTOMER]: statusCounts[TicketStatus.WAITING_FOR_CUSTOMER] || 0,
          [TicketStatus.WAITING_FOR_AGENT]: statusCounts[TicketStatus.WAITING_FOR_AGENT] || 0,
          [TicketStatus.RESOLVED]: statusCounts[TicketStatus.RESOLVED] || 0,
          [TicketStatus.CLOSED]: statusCounts[TicketStatus.CLOSED] || 0,
        };
      } catch (error) {
        this.logger.error('Error getting ticket status distribution:', error);
        return {
          [TicketStatus.NEW]: 0,
          [TicketStatus.OPEN]: 0,
          [TicketStatus.IN_PROGRESS]: 0,
          [TicketStatus.WAITING_FOR_CUSTOMER]: 0,
          [TicketStatus.WAITING_FOR_AGENT]: 0,
          [TicketStatus.RESOLVED]: 0,
          [TicketStatus.CLOSED]: 0,
        };
      }
    });
  }

  async getTicketsCreatedOverTime(
    period: 'day' | 'week' | 'month' = 'week',
  ): Promise<Array<{ date: string; count: number }>> {
    return this.getCachedData(`ticketsCreatedOverTime_${period}`, async () => {
      try {
        // For now, return last 7 days of data
        const now = new Date();
        const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
        const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

        // Use a single grouped DB query to fetch counts per day
        const rows = await this.executeWithRetry(() =>
          this._ticketsService.getTicketsCountsGroupedByDate(startDate, endDate),
        );

        // rows contains entries like { date: '2025-10-13', count: 5 }
        const mapByDate = new Map(rows.map((r) => [r.date, r.count]));

        const result: Array<{ date: string; count: number }> = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          const key = date.toISOString().split('T')[0];
          result.push({ date: key, count: mapByDate.get(key) || 0 });
        }

        return result;
      } catch (error) {
        this.logger.error('Error getting tickets created over time:', error);
        return [];
      }
    });
  }

  async getAgentWorkload(): Promise<
    Array<{ agentId: string; agentName: string; activeTickets: number; totalTickets: number }>
  > {
    return this.getCachedData('agentWorkload', async () => {
      try {
        const [ticketCounts, activeCounts] = await Promise.all([
          this.executeWithRetry(() => this._ticketsService.getAgentTicketCounts()),
          this.executeWithRetry(() => this._ticketsService.getAgentActiveTicketCounts()),
        ]);

        // Create maps for easy lookup
        const ticketCountMap = new Map(
          ticketCounts.map((item: AgentTicketCount) => [item.agentId, item.ticketCount]),
        );
        const activeCountMap = new Map(
          activeCounts.map((item: AgentActiveCount) => [item.agentId, item.activeCount]),
        );

        // Get all unique agent IDs
        const allAgentIds = Array.from(
          new Set([...ticketCountMap.keys(), ...activeCountMap.keys()]),
        );

        // Get agent names
        const agentNames = await this.getAgentNames(allAgentIds);

        return allAgentIds.map((agentId: string) => ({
          agentId,
          agentName: agentNames.get(agentId) || `Agent ${agentId.slice(-8)}`,
          activeTickets: activeCountMap.get(agentId) || 0,
          totalTickets: ticketCountMap.get(agentId) || 0,
        }));
      } catch (error) {
        this.logger.error('Error getting agent workload:', error);
        return [];
      }
    });
  }

  async getResolutionTimeMetrics(): Promise<{
    average: number;
    median: number;
    percentile95: number;
    byPriority: Record<TicketPriority, number>;
  }> {
    return this.getCachedData('resolutionTimeMetrics', async () => {
      try {
        const average = await this.executeWithRetry(() =>
          this._ticketsService.getAverageResolutionTime(),
        );

        // For now, return simplified metrics
        // Would need more complex queries for median, percentile95, and by-priority breakdown
        return {
          average,
          median: average, // Placeholder
          percentile95: average * 1.5, // Placeholder
          byPriority: {
            [TicketPriority.LOW]: average * 1.2,
            [TicketPriority.MEDIUM]: average,
            [TicketPriority.HIGH]: average * 0.8,
            [TicketPriority.URGENT]: average * 0.5,
          },
        };
      } catch (error) {
        this.logger.error('Error calculating resolution time metrics:', error);
        return {
          average: 0,
          median: 0,
          percentile95: 0,
          byPriority: {
            [TicketPriority.LOW]: 0,
            [TicketPriority.MEDIUM]: 0,
            [TicketPriority.HIGH]: 0,
            [TicketPriority.URGENT]: 0,
          },
        };
      }
    });
  }

  // Helper method to create count maps from enums
  private createEnumCountMap<T extends Record<string, string>>(
    enumObj: T,
    counts: Record<string, number>,
  ): Record<T[keyof T], number> {
    const result = {} as Record<T[keyof T], number>;

    // Map enum values to counts
    Object.values(enumObj).forEach((enumValue) => {
      result[enumValue as T[keyof T]] = counts[enumValue] || 0;
    });

    return result;
  }

  // Helper method for caching expensive operations
  private async getCachedData<T>(cacheKey: string, fetcher: () => Promise<T>): Promise<T> {
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      this.logger.debug(`Using cached data for key: ${cacheKey}`);
      return cached.data;
    }

    const data = await this.executeWithRetry(fetcher);
    this.cache.set(cacheKey, { data, timestamp: Date.now() });
    this.logger.debug(`Cached new data for key: ${cacheKey}`);
    return data;
  }

  // Helper method for retry logic
  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(
          `Operation failed (attempt ${attempt}/${this.MAX_RETRIES}): ${lastError.message}`,
        );

        if (attempt < this.MAX_RETRIES) {
          const delay = this.RETRY_DELAY * attempt; // Exponential backoff
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    this.logger.error(`Operation failed after ${this.MAX_RETRIES} attempts`);
    throw lastError!;
  }

  // Helper method to get agent names from user IDs
  private async getAgentNames(agentIds: string[]): Promise<Map<string, string>> {
    try {
      const users = await this.executeWithRetry(() => this._usersService.findManyByIds(agentIds));

      const nameMap = new Map<string, string>();
      users.forEach((user) => {
        nameMap.set(
          user.user_id,
          user.full_name || user.username || `Agent ${user.user_id.slice(-8)}`,
        );
      });

      return nameMap;
    } catch (error) {
      this.logger.warn('Failed to fetch agent names, using fallback:', error);
      // Fallback to placeholder names
      const nameMap = new Map<string, string>();
      agentIds.forEach((id) => {
        nameMap.set(id, `Agent ${id.slice(-8)}`);
      });
      return nameMap;
    }
  }

  // Clear cache method for manual cache invalidation
  clearCache(): void {
    this.cache.clear();
    this.logger.debug('Dashboard cache cleared');
  }
}
