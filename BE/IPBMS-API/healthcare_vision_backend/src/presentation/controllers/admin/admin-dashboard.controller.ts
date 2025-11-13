import { Controller, Get, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  AdminDashboardService,
  AdminDashboardData,
} from '../../../application/services/admin/admin-dashboard.service';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { UserRole } from '../../../core/entities/users.entity';
import {
  AdminDashboardDataDto,
  TicketStatisticsDto,
  AgentPerformanceDto,
  CustomerSatisfactionDto,
  ResolutionTimeMetricsDto,
  AgentWorkloadDto,
} from '../../../application/dto/admin-dashboard/admin-dashboard.dto';

@ApiTags('admin-dashboard')
@Controller('admin/dashboard')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminDashboardController {
  private readonly logger = new Logger(AdminDashboardController.name);

  constructor(private readonly _adminDashboardService: AdminDashboardService) {}

  @Get()
  @ApiOperation({
    summary: 'Get admin dashboard data',
    description:
      'Retrieves comprehensive dashboard data including ticket statistics, agent performance, and customer satisfaction metrics. Requires admin role.',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard data retrieved successfully',
    type: AdminDashboardDataDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async getDashboardData(): Promise<AdminDashboardData> {
    try {
      this.logger.log('Retrieving admin dashboard data');
      const data = await this._adminDashboardService.getDashboardData();
      this.logger.log('Admin dashboard data retrieved successfully');
      return data;
    } catch (error) {
      this.logger.error('Error retrieving admin dashboard data:', error);
      throw error;
    }
  }

  @Get('ticket-statistics')
  @ApiOperation({
    summary: 'Get ticket statistics',
    description:
      'Retrieves detailed ticket statistics including counts by status, priority, category, and time-based metrics.',
  })
  @ApiResponse({
    status: 200,
    description: 'Ticket statistics retrieved successfully',
    type: TicketStatisticsDto,
  })
  async getTicketStatistics() {
    try {
      this.logger.log('Retrieving ticket statistics');
      const stats = await this._adminDashboardService.getTicketStatistics();
      this.logger.log('Ticket statistics retrieved successfully');
      return stats;
    } catch (error) {
      this.logger.error('Error retrieving ticket statistics:', error);
      throw error;
    }
  }

  @Get('agent-performance')
  @ApiOperation({
    summary: 'Get agent performance metrics',
    description:
      'Retrieves performance metrics for all support agents including resolution times, ratings, and workload.',
  })
  @ApiResponse({
    status: 200,
    description: 'Agent performance metrics retrieved successfully',
    type: [AgentPerformanceDto],
  })
  async getAgentPerformance() {
    try {
      this.logger.log('Retrieving agent performance metrics');
      const performance = await this._adminDashboardService.getAgentPerformance();
      this.logger.log('Agent performance metrics retrieved successfully');
      return performance;
    } catch (error) {
      this.logger.error('Error retrieving agent performance metrics:', error);
      throw error;
    }
  }

  @Get('customer-satisfaction')
  @ApiOperation({
    summary: 'Get customer satisfaction metrics',
    description: 'Retrieves customer satisfaction data including ratings, trends, and top issues.',
  })
  @ApiResponse({
    status: 200,
    description: 'Customer satisfaction metrics retrieved successfully',
    type: CustomerSatisfactionDto,
  })
  async getCustomerSatisfaction() {
    try {
      this.logger.log('Retrieving customer satisfaction metrics');
      const satisfaction = await this._adminDashboardService.getCustomerSatisfaction();
      this.logger.log('Customer satisfaction metrics retrieved successfully');
      return satisfaction;
    } catch (error) {
      this.logger.error('Error retrieving customer satisfaction metrics:', error);
      throw error;
    }
  }

  @Get('resolution-times')
  @ApiOperation({
    summary: 'Get resolution time metrics',
    description:
      'Retrieves resolution time analytics including averages, percentiles, and metrics by priority.',
  })
  @ApiResponse({
    status: 200,
    description: 'Resolution time metrics retrieved successfully',
    type: ResolutionTimeMetricsDto,
  })
  async getResolutionTimeMetrics() {
    try {
      this.logger.log('Retrieving resolution time metrics');
      const metrics = await this._adminDashboardService.getResolutionTimeMetrics();
      this.logger.log('Resolution time metrics retrieved successfully');
      return metrics;
    } catch (error) {
      this.logger.error('Error retrieving resolution time metrics:', error);
      throw error;
    }
  }

  @Get('agent-workload')
  @ApiOperation({
    summary: 'Get agent workload data',
    description: 'Retrieves current workload information for all support agents.',
  })
  @ApiResponse({
    status: 200,
    description: 'Agent workload data retrieved successfully',
    type: [AgentWorkloadDto],
  })
  async getAgentWorkload() {
    try {
      this.logger.log('Retrieving agent workload data');
      const workload = await this._adminDashboardService.getAgentWorkload();
      this.logger.log('Agent workload data retrieved successfully');
      return workload;
    } catch (error) {
      this.logger.error('Error retrieving agent workload data:', error);
      throw error;
    }
  }
}
