import { Controller, Get, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { DashboardService } from '../../../application/services/dashboard.service';
import { timeUtils } from '../../../shared/constants/time.constants';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'caregiver', 'customer')
@Controller('reports')
export class ReportsController {
  constructor(private readonly _dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách báo cáo sức khỏe' })
  @ApiResponse({ status: 200, description: 'Danh sách báo cáo' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'user_id', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('user_id') user_id?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    // Use dashboard service to get report requests summary
    const summary = await this._dashboardService.getReportRequestsSummary(from, to, user_id);

    // Return summary as the main data
    return {
      data: [summary],
      total: 1,
      page: page || 1,
      limit: limit || 20,
      totalPages: 1,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy báo cáo theo ID' })
  @ApiResponse({ status: 200, description: 'Chi tiết báo cáo' })
  async findById(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    // For now, return a mock report
    // In a real implementation, this would fetch from a reports table
    const now = new Date();
    return {
      id,
      title: 'Health Report',
      type: 'health',
      status: 'completed',
      created_at: now.toISOString(),
      created_at_local: timeUtils.toTimezoneIsoString(now),
      data: {
        summary: 'Sample health report data',
        metrics: {},
      },
    };
  }
}
