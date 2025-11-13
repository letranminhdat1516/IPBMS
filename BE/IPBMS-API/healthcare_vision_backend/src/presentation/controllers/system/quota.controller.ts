import { Controller, Get, Post, Param, Body, UseGuards, Req, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { QuotaService } from '../../../application/services/admin';
import { timeUtils } from '../../../shared/constants/time.constants';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { Request } from 'express';

@ApiTags('quota')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('quota')
export class QuotaController {
  constructor(private readonly _quotaService: QuotaService) {}

  @Get('status/:userId')
  @Roles('admin', 'caregiver', 'customer')
  @ApiOperation({ summary: 'Lấy real-time quota status cho user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Quota status information',
    schema: {
      type: 'object',
      properties: {
        quota: { type: 'object' },
        usage: {
          type: 'object',
          properties: {
            camera_count: { type: 'number' },
            caregiver_count: { type: 'number' },
            room_count: { type: 'number' },
            storage_used_gb: { type: 'number' },
          },
        },
        cameras: {
          type: 'object',
          properties: {
            allowed: { type: 'boolean' },
            quota: { type: 'number' },
            used: { type: 'number' },
          },
        },
        caregivers: {
          type: 'object',
          properties: {
            allowed: { type: 'boolean' },
            quota: { type: 'number' },
            used: { type: 'number' },
          },
        },
        storage: {
          type: 'object',
          properties: {
            exceeded: { type: 'boolean' },
            quota: { type: 'number' },
            used: { type: 'number' },
          },
        },
      },
    },
  })
  async getQuotaStatus(@Param('userId') userId: string) {
    return await this._quotaService.getQuotaStatus(userId);
  }

  @Post('check-entitlement')
  @Roles('admin', 'caregiver', 'customer')
  @ApiOperation({ summary: 'Kiểm tra entitlement cho action' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['userId', 'resourceType'],
      properties: {
        userId: { type: 'string' },
        resourceType: { type: 'string', enum: ['camera', 'caregiver', 'storage', 'site'] },
        action: { type: 'string', enum: ['add', 'use'], default: 'add' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Entitlement check result',
    schema: {
      type: 'object',
      properties: {
        allowed: { type: 'boolean' },
        warning: { type: 'string' },
        error: { type: 'string' },
        gracePeriod: {
          type: 'object',
          properties: {
            daysRemaining: { type: 'number' },
            message: { type: 'string' },
          },
        },
      },
    },
  })
  async checkEntitlement(
    @Body()
    body: {
      userId: string;
      resourceType: 'camera' | 'caregiver' | 'storage' | 'site';
      action?: 'add' | 'use';
    },
  ) {
    const { userId, resourceType, action = 'add' } = body;
    return await this._quotaService.checkEntitlement(userId, resourceType, action);
  }

  @Get('usage/realtime/:userId')
  @Roles('admin', 'caregiver', 'customer')
  @ApiOperation({ summary: 'Lấy real-time usage monitoring' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Real-time usage data',
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' },
        usage: {
          type: 'object',
          properties: {
            camera_count: { type: 'number' },
            caregiver_count: { type: 'number' },
            room_count: { type: 'number' },
            storage_used_gb: { type: 'number' },
          },
        },
        limits: {
          type: 'object',
          properties: {
            camera_quota: { type: 'number' },
            caregiver_seats: { type: 'number' },
            storage_gb: { type: 'number' },
            sites: { type: 'number' },
          },
        },
        percentages: {
          type: 'object',
          properties: {
            cameras: { type: 'number' },
            caregivers: { type: 'number' },
            storage: { type: 'number' },
            sites: { type: 'number' },
          },
        },
      },
    },
  })
  async getRealtimeUsage(@Param('userId') userId: string) {
    const usage = await this._quotaService.getUserQuotaUsage(userId);
    const quotaStatus = await this._quotaService.getQuotaStatus(userId);

    const now = new Date();
    return {
      userId,
      timestamp: now.toISOString(),
      timestamp_local: timeUtils.toTimezoneIsoString(now),
      usage,
      limits: {
        camera_quota: quotaStatus.cameras.quota,
        caregiver_seats: quotaStatus.caregivers.quota,
        storage_gb: quotaStatus.storage.quota,
        sites: 10, // Default site limit
      },
      percentages: {
        cameras: (usage.camera_count / quotaStatus.cameras.quota) * 100,
        caregivers: (usage.caregiver_count / quotaStatus.caregivers.quota) * 100,
        storage: (quotaStatus.storage.used / quotaStatus.storage.quota) * 100,
        sites: (usage.room_count / 10) * 100,
      },
    };
  }

  @Get('usage/history')
  @Roles('admin', 'caregiver', 'customer')
  @ApiOperation({ summary: 'Lấy usage history theo thời gian' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Số trang (1-based). Mặc định 1.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Số mục trên mỗi trang. Mặc định 50.',
  })
  @ApiQuery({ name: 'userId', required: true, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String, example: '2025-01-01' })
  @ApiQuery({ name: 'endDate', required: false, type: String, example: '2025-12-31' })
  @ApiQuery({
    name: 'resourceType',
    required: false,
    enum: ['camera', 'caregiver', 'storage', 'site'],
  })
  @ApiResponse({
    status: 200,
    description: 'Usage history data',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          date: { type: 'string', format: 'date' },
          camera_count: { type: 'number' },
          caregiver_count: { type: 'number' },
          storage_used_gb: { type: 'number' },
          room_count: { type: 'number' },
        },
      },
    },
  })
  async getUsageHistory(
    @Query('userId') userId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('resourceType') _resourceType?: string,
  ) {
    // For now, return mock historical data
    // In production, this would query from usage_logs table
    const mockHistory = [];
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      mockHistory.push({
        date: d.toISOString().split('T')[0],
        date_local: timeUtils.toTimezoneIsoString(d)?.split('T')[0],
        camera_count: Math.floor(Math.random() * 10) + 1,
        caregiver_count: Math.floor(Math.random() * 5) + 1,
        storage_used_gb: Math.random() * 5 + 1,
        room_count: Math.floor(Math.random() * 3) + 1,
      });
    }

    return mockHistory;
  }

  @Post('check-soft-cap')
  @Roles('admin', 'caregiver', 'customer')
  @ApiOperation({ summary: 'Kiểm tra soft cap warnings' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['userId', 'resourceType'],
      properties: {
        userId: { type: 'string' },
        resourceType: { type: 'string', enum: ['camera', 'caregiver', 'storage', 'site'] },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Soft cap check result',
    schema: {
      type: 'object',
      properties: {
        warning: { type: 'boolean' },
        message: { type: 'string' },
        percentage: { type: 'number' },
      },
    },
  })
  async checkSoftCap(
    @Body() body: { userId: string; resourceType: 'camera' | 'caregiver' | 'storage' | 'site' },
  ) {
    const { userId, resourceType } = body;
    return await this._quotaService.checkSoftCap(userId, resourceType);
  }

  @Post('check-grace-period')
  @Roles('admin', 'caregiver', 'customer')
  @ApiOperation({ summary: 'Kiểm tra grace period status' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['userId', 'resourceType'],
      properties: {
        userId: { type: 'string' },
        resourceType: { type: 'string', enum: ['camera', 'caregiver', 'storage', 'site'] },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Grace period check result',
    schema: {
      type: 'object',
      properties: {
        allowed: { type: 'boolean' },
        daysRemaining: { type: 'number' },
        message: { type: 'string' },
      },
    },
  })
  async checkGracePeriod(
    @Body() body: { userId: string; resourceType: 'camera' | 'caregiver' | 'storage' | 'site' },
  ) {
    const { userId, resourceType } = body;
    return await this._quotaService.checkGracePeriod(userId, resourceType);
  }

  @Post('enforce-hard-cap')
  @Roles('admin', 'caregiver', 'customer')
  @ApiOperation({ summary: 'Enforce hard cap (throw error if exceeded)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['userId', 'resourceType'],
      properties: {
        userId: { type: 'string' },
        resourceType: { type: 'string', enum: ['camera', 'caregiver', 'storage', 'site'] },
        action: { type: 'string', enum: ['add', 'use'], default: 'add' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Hard cap check passed',
    schema: {
      type: 'object',
      properties: {
        allowed: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Hard cap check passed' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Hard cap exceeded',
    schema: {
      type: 'object',
      properties: {
        error: { type: 'string', example: 'Camera quota exceeded. Current: 6, Limit: 5' },
      },
    },
  })
  async enforceHardCap(
    @Body()
    body: {
      userId: string;
      resourceType: 'camera' | 'caregiver' | 'storage' | 'site';
      action?: 'add' | 'use';
    },
  ) {
    const { userId, resourceType, action = 'add' } = body;
    await this._quotaService.enforceHardCap(userId, resourceType, action);
    return { allowed: true, message: 'Hard cap check passed' };
  }

  // Legacy endpoint - keep for backward compatibility
  @Get()
  @ApiOperation({ summary: 'Lấy thông tin quota hiện tại (legacy)' })
  @ApiResponse({ status: 200, description: 'Thông tin quota' })
  async getQuota(@Req() _req: Request) {
    // For now, return a mock quota
    // In a real implementation, this would get user-specific quota
    return {
      camera_quota: 5,
      retention_days: 30,
      caregiver_seats: 2,
      sites: 1,
      max_storage_gb: 10,
      used_cameras: 2,
      used_storage_gb: 3.5,
    };
  }
}
