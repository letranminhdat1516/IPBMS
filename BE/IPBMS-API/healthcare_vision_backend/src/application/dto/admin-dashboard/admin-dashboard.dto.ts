import { ApiProperty } from '@nestjs/swagger';
import { TicketCategory, TicketPriority, TicketStatus } from '../../../shared/types/ticket-enums';

export class TicketStatisticsDto {
  @ApiProperty({ description: 'Total number of tickets' })
  total!: number;

  @ApiProperty({
    description: 'Ticket count by status',
    type: 'object',
    additionalProperties: { type: 'number' },
  })
  byStatus!: Record<TicketStatus, number>;

  @ApiProperty({
    description: 'Ticket count by priority',
    type: 'object',
    additionalProperties: { type: 'number' },
  })
  byPriority!: Record<TicketPriority, number>;

  @ApiProperty({
    description: 'Ticket count by category',
    type: 'object',
    additionalProperties: { type: 'number' },
  })
  byCategory!: Record<TicketCategory, number>;

  @ApiProperty({ description: 'Tickets created today' })
  createdToday!: number;

  @ApiProperty({ description: 'Tickets created this week' })
  createdThisWeek!: number;

  @ApiProperty({ description: 'Tickets created this month' })
  createdThisMonth!: number;

  @ApiProperty({ description: 'Tickets resolved today' })
  resolvedToday!: number;

  @ApiProperty({ description: 'Tickets resolved this week' })
  resolvedThisWeek!: number;

  @ApiProperty({ description: 'Tickets resolved this month' })
  resolvedThisMonth!: number;

  @ApiProperty({ description: 'Average resolution time in hours' })
  averageResolutionTime!: number;

  @ApiProperty({ description: 'Average first response time in hours' })
  averageFirstResponseTime!: number;
}

export class AgentPerformanceDto {
  @ApiProperty({ description: 'Agent ID' })
  agentId!: string;

  @ApiProperty({ description: 'Agent name' })
  agentName!: string;

  @ApiProperty({ description: 'Number of tickets assigned' })
  ticketsAssigned!: number;

  @ApiProperty({ description: 'Number of tickets resolved' })
  ticketsResolved!: number;

  @ApiProperty({ description: 'Number of tickets in progress' })
  ticketsInProgress!: number;

  @ApiProperty({ description: 'Average resolution time in hours' })
  averageResolutionTime!: number;

  @ApiProperty({ description: 'Average rating received' })
  averageRating!: number;

  @ApiProperty({ description: 'Total number of ratings' })
  totalRatings!: number;

  @ApiProperty({ description: 'Response rate percentage' })
  responseRate!: number;
}

export class CustomerSatisfactionDto {
  @ApiProperty({ description: 'Average customer rating' })
  averageRating!: number;

  @ApiProperty({ description: 'Total number of ratings' })
  totalRatings!: number;

  @ApiProperty({
    description: 'Rating distribution (1-5 stars)',
    type: 'object',
    additionalProperties: { type: 'number' },
  })
  ratingDistribution!: Record<number, number>;

  @ApiProperty({ description: 'Satisfaction trend over time' })
  satisfactionTrend!: {
    last7Days: number;
    last30Days: number;
    last90Days: number;
  };

  @ApiProperty({ description: 'Top issues by category', type: [Object] })
  topIssues!: Array<{
    category: TicketCategory;
    count: number;
    averageRating: number;
  }>;
}

export class AdminDashboardDataDto {
  @ApiProperty({ description: 'Ticket statistics', type: TicketStatisticsDto })
  ticketStatistics!: TicketStatisticsDto;

  @ApiProperty({ description: 'Agent performance metrics', type: [AgentPerformanceDto] })
  agentPerformance!: AgentPerformanceDto[];

  @ApiProperty({ description: 'Customer satisfaction metrics', type: CustomerSatisfactionDto })
  customerSatisfaction!: CustomerSatisfactionDto;

  @ApiProperty({ description: 'Recent activity', type: [Object] })
  recentActivity!: any[];
}

export class ResolutionTimeMetricsDto {
  @ApiProperty({ description: 'Average resolution time in hours' })
  average!: number;

  @ApiProperty({ description: 'Median resolution time in hours' })
  median!: number;

  @ApiProperty({ description: '95th percentile resolution time in hours' })
  percentile95!: number;

  @ApiProperty({
    description: 'Resolution time by priority',
    type: 'object',
    additionalProperties: { type: 'number' },
  })
  byPriority!: Record<TicketPriority, number>;
}

export class AgentWorkloadDto {
  @ApiProperty({ description: 'Agent ID' })
  agentId!: string;

  @ApiProperty({ description: 'Agent name' })
  agentName!: string;

  @ApiProperty({ description: 'Number of active tickets' })
  activeTickets!: number;

  @ApiProperty({ description: 'Total tickets assigned' })
  totalTickets!: number;
}
