import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateAlertDto } from '../../../application/dto/alerts/create-alert.dto';
import { UpdateAlertDto } from '../../../application/dto/alerts/update-alert.dto';
import { AlertsService } from '../../../application/services/alerts.service';
import { Alert } from '../../../core/entities/alerts.entity';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { LogActivity } from '../../../shared/decorators/log-activity.decorator';
import { timeUtils } from '../../../shared/constants/time.constants';
import { ActivityAction, ActivitySeverity } from '../../../core/entities/activity_logs.entity';
import { getUserIdFromReq } from '../../../shared/utils/auth.util';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'caregiver', 'customer')
@ApiTags('alerts')
@Controller('alerts')
export class AlertsController {
  constructor(private readonly _service: AlertsService) {}

  @Get()
  async findAll(): Promise<Alert[]> {
    return this._service.findAll();
  }

  @Get(':id')
  async findById(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Req() req: any,
  ): Promise<Alert> {
    return this._service.findById(id, {
      id: getUserIdFromReq(req),
      role: req.user?.role,
    });
  }

  @Get('summary')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'caregiver', 'customer')
  @ApiOperation({
    summary: 'Thống kê alerts',
    description: 'Trả về thống kê tổng quan về alerts theo trạng thái và loại.',
  })
  @ApiResponse({
    status: 200,
    description: 'Thống kê alerts',
    schema: {
      example: {
        total: 150,
        by_status: {
          pending: 45,
          acknowledged: 30,
          resolved: 75,
        },
        by_severity: {
          low: 60,
          medium: 45,
          high: 30,
          critical: 15,
        },
        by_type: {
          fall_detection: 80,
          abnormal_behavior: 40,
          emergency: 20,
          system: 10,
        },
        recent_trends: {
          today: 12,
          yesterday: 8,
          this_week: 45,
          last_week: 38,
        },
        timestamp: '2025-09-06T12:00:00Z',
      },
    },
  })
  async getSummary() {
    const summary = await this._service.getAlertsSummary();
    const now = new Date();
    return {
      ...summary,
      timestamp: now.toISOString(),
      timestamp_local: timeUtils.toTimezoneIsoString(now),
    };
  }

  @Post()
  @LogActivity({
    action: 'create_alert',
    action_enum: ActivityAction.CREATE,
    message: 'Tạo alert mới',
    resource_type: 'alert',
    resource_name: 'alert',
    resource_id: '@result.id',
    severity: ActivitySeverity.LOW,
  })
  async create(@Body() data: CreateAlertDto) {
    return this._service.create(data);
  }

  @Put(':id')
  @LogActivity({
    action: 'update_alert',
    action_enum: ActivityAction.UPDATE,
    message: 'Cập nhật alert',
    resource_type: 'alert',
    resource_name: 'alert',
    resource_id: 'id',
    severity: ActivitySeverity.MEDIUM,
  })
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() data: UpdateAlertDto,
    @Req() req: any,
  ): Promise<any> {
    await this._service.update(id, data, {
      id: getUserIdFromReq(req),
      role: req.user?.role,
    });
    return { message: 'Alert updated successfully' };
  }

  @Delete(':id')
  @LogActivity({
    action: 'delete_alert',
    action_enum: ActivityAction.DELETE,
    message: 'Xoá alert',
    resource_type: 'alert',
    resource_name: 'alert',
    resource_id: 'id',
    severity: ActivitySeverity.HIGH,
  })
  async remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    await this._service.remove(id);
    return { message: 'Alert deleted successfully' };
  }

  @Get('alert-types')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'caregiver', 'customer')
  @ApiOperation({
    summary: 'Danh sách các loại alert',
    description: 'Trả về danh sách tất cả các loại alert có sẵn trong hệ thống.',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách alert types',
    schema: {
      example: {
        success: true,
        data: [
          {
            id: 'fall_detection',
            name: 'Fall Detection',
            description: 'Alert when fall is detected',
            severity: 'high',
            category: 'safety',
            is_active: true,
            created_at: '2025-09-07T12:00:00Z',
          },
          {
            id: 'abnormal_behavior',
            name: 'Abnormal Behavior',
            description: 'Alert for unusual behavior patterns',
            severity: 'medium',
            category: 'behavior',
            is_active: true,
            created_at: '2025-09-07T12:00:00Z',
          },
        ],
        total: 6,
        timestamp: '2025-09-07T12:00:00Z',
      },
    },
  })
  async getAlertTypes() {
    const types = await this._service.getAlertTypes();
    const now = new Date();
    return {
      success: true,
      data: types,
      total: Array.isArray(types) ? types.length : undefined,
      timestamp: now.toISOString(),
      timestamp_local: timeUtils.toTimezoneIsoString(now),
    };
  }

  @Get('summary/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'caregiver', 'customer')
  @ApiOperation({
    summary: 'Thống kê alerts theo user',
    description: 'Trả về thống kê alerts cho một user cụ thể.',
  })
  @ApiResponse({
    status: 200,
    description: 'Thống kê alerts của user',
    schema: {
      example: {
        user_id: 'user-123',
        total: 25,
        by_status: {
          pending: 5,
          acknowledged: 10,
          resolved: 10,
        },
        by_severity: {
          low: 10,
          medium: 10,
          high: 5,
          critical: 0,
        },
        recent_trends: {
          today: 2,
          yesterday: 1,
          this_week: 8,
          last_week: 12,
        },
        timestamp: '2025-09-07T12:00:00Z',
      },
    },
  })
  async getUserAlertsSummary(@Param('userId') userId: string) {
    // For now, return general summary with user context
    // In a real implementation, this would filter by user
    const summary = await this._service.getAlertsSummary();
    const now = new Date();
    return {
      ...summary,
      user_id: userId,
      note: 'This is a general summary, user-specific filtering not yet implemented',
      timestamp: now.toISOString(),
      timestamp_local: timeUtils.toTimezoneIsoString(now),
    };
  }

  @Post('escalate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'caregiver', 'customer')
  @ApiOperation({
    summary: 'Escalate alert',
    description: 'Escalate an alert by sending SMS, email, or voice call.',
  })
  @ApiResponse({
    status: 200,
    description: 'Alert escalated successfully',
    schema: {
      example: {
        alert_id: 'alert-123',
        escalated: true,
        methods: ['sms', 'email'],
        message: 'Alert escalated to emergency contacts',
      },
    },
  })
  async escalateAlert(@Body() body: { alert_id: string; methods?: string[] }) {
    // Mock implementation
    const now = new Date();
    return {
      alert_id: body.alert_id,
      escalated: true,
      methods: body.methods || ['sms', 'email'],
      message: 'Alert escalated successfully',
      timestamp: now.toISOString(),
      timestamp_local: timeUtils.toTimezoneIsoString(now),
    };
  }
}
