import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ActivityLogsService } from '../../../application/services/shared/activity-logs.service';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';

@ApiTags('settings-admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('settings/admin')
export class SettingsAdminController {
  constructor(private readonly activityLogs: ActivityLogsService) {}

  @Get('changes')
  @ApiOperation({ summary: 'Lấy lịch sử thay đổi settings' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách thay đổi settings',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' },
              actor_name: { type: 'string' },
              action: { type: 'string' },
              resource_type: { type: 'string' },
              resource_id: { type: 'string' },
              resource_name: { type: 'string' },
              message: { type: 'string' },
              meta: { type: 'object' },
            },
          },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
      },
    },
  })
  async getSettingChanges(
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('category') category?: string,
    @Query('key') key?: string,
    @Query('userId') userId?: string,
  ) {
    // Lấy tất cả activity logs liên quan đến settings
    const allLogs = await this.activityLogs.findAll();

    // Filter chỉ lấy setting changes
    let settingLogs = allLogs.filter(
      (log) => log.resource_type === 'setting' && log.action?.startsWith('setting_'),
    );

    // Filter theo category từ meta
    if (category) {
      settingLogs = settingLogs.filter((log) => (log.meta as any)?.category === category);
    }

    // Filter theo key
    if (key) {
      settingLogs = settingLogs.filter((log) => log.resource_id === key);
    }

    // Filter theo user
    if (userId) {
      settingLogs = settingLogs.filter((log) => log.actor_id === userId);
    }

    // Sort by timestamp desc
    settingLogs.sort(
      (a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime(),
    );

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedLogs = settingLogs.slice(startIndex, endIndex);

    return {
      data: paginatedLogs,
      total: settingLogs.length,
      page: Number(page),
      limit: Number(limit),
    };
  }

  @Get('changes/summary')
  @ApiOperation({ summary: 'Thống kê thay đổi settings' })
  @ApiResponse({
    status: 200,
    description: 'Thống kê thay đổi settings',
  })
  async getSettingChangesSummary() {
    const allLogs = await this.activityLogs.findAll();
    const settingLogs = allLogs.filter(
      (log) => log.resource_type === 'setting' && log.action?.startsWith('setting_'),
    );

    const summary = {
      total_changes: settingLogs.length,
      by_action: {} as Record<string, number>,
      by_category: {} as Record<string, number>,
      by_user: {} as Record<string, number>,
      recent_changes: settingLogs.slice(0, 10).map((log) => ({
        timestamp: log.timestamp,
        actor_name: log.actor_name,
        action: log.action,
        resource_name: log.resource_name,
        message: log.message,
      })),
    };

    settingLogs.forEach((log) => {
      // Count by action
      const action = log.action || 'unknown';
      summary.by_action[action] = (summary.by_action[action] || 0) + 1;

      // Count by category
      const category = (log.meta as any)?.category || 'general';
      summary.by_category[category] = (summary.by_category[category] || 0) + 1;

      // Count by user
      const user = log.actor_name || log.actor_id || 'system';
      summary.by_user[user] = (summary.by_user[user] || 0) + 1;
    });

    return summary;
  }
}
