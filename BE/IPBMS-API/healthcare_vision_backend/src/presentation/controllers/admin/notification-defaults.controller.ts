import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UpdateSystemNotificationDefaultsDto } from '../../../application/dto/notifications/notification-preferences.dto';
import { NotificationPreferencesService } from '../../../application/services/notification-preferences.service';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { LogActivity } from '../../../shared/decorators/log-activity.decorator';
import { ActivityAction, ActivitySeverity } from '../../../core/entities/activity_logs.entity';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/notification-defaults')
export class AdminNotificationDefaultsController {
  constructor(private readonly _notificationPreferencesService: NotificationPreferencesService) {}

  @Get()
  @ApiOperation({
    summary: '📋 Lấy cài đặt mặc định thông báo hệ thống',
    description: 'Trả về cài đặt mặc định thông báo cho tất cả người dùng mới',
  })
  @ApiResponse({
    status: 200,
    description: 'Cài đặt mặc định thông báo hệ thống',
    schema: {
      type: 'object',
      properties: {
        system_events_enabled: { type: 'boolean', example: true },
        actor_messages_enabled: { type: 'boolean', example: true },
        push_notifications_enabled: { type: 'boolean', example: true },
        email_notifications_enabled: { type: 'boolean', example: false },
        fall_detection_enabled: { type: 'boolean', example: true },
        seizure_detection_enabled: { type: 'boolean', example: true },
        abnormal_behavior_enabled: { type: 'boolean', example: true },
        emergency_enabled: { type: 'boolean', example: true },
        device_offline_enabled: { type: 'boolean', example: true },
        payment_failed_enabled: { type: 'boolean', example: true },
        subscription_expiry_enabled: { type: 'boolean', example: true },
        health_check_reminder_enabled: { type: 'boolean', example: true },
        appointment_reminder_enabled: { type: 'boolean', example: true },
        permission_request_enabled: { type: 'boolean', example: true },
        event_update_enabled: { type: 'boolean', example: true },
        caregiver_invitation_enabled: { type: 'boolean', example: true },
        ticket_created_enabled: { type: 'boolean', example: true },
        ticket_assigned_enabled: { type: 'boolean', example: true },
        ticket_status_changed_enabled: { type: 'boolean', example: true },
        ticket_message_enabled: { type: 'boolean', example: true },
        ticket_rated_enabled: { type: 'boolean', example: true },
        ticket_closed_enabled: { type: 'boolean', example: true },
      },
    },
  })
  async getSystemDefaults() {
    return this._notificationPreferencesService.getSystemDefaults();
  }

  @Put()
  @ApiOperation({
    summary: '✏️ Cập nhật cài đặt mặc định thông báo hệ thống',
    description: 'Cập nhật cài đặt mặc định thông báo cho tất cả người dùng mới',
  })
  @ApiResponse({
    status: 200,
    description: 'Cài đặt mặc định thông báo đã được cập nhật',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'System notification defaults updated successfully' },
        updated_fields: {
          type: 'array',
          items: { type: 'string' },
          example: ['fall_detection_enabled', 'emergency_enabled'],
        },
      },
    },
  })
  @LogActivity({
    action: 'update_system_notification_defaults',
    action_enum: ActivityAction.UPDATE,
    message: 'Admin cập nhật cài đặt mặc định thông báo hệ thống',
    resource_type: 'system_config',
    resource_name: 'notification_defaults',
    severity: ActivitySeverity.HIGH,
  })
  async updateSystemDefaults(@Body() updates: UpdateSystemNotificationDefaultsDto) {
    return this._notificationPreferencesService.updateSystemDefaults(updates);
  }
}
