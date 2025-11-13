import { Body, Controller, Delete, Get, Put, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  SetQuietHoursDto,
  UpdateNotificationPreferencesDto,
} from '../../../application/dto/notifications/notification-preferences.dto';
import { NotificationPreferencesService } from '../../../application/services/notification-preferences.service';
import { NotificationPreference } from '../../../core/entities/notification-preferences.entity';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { LogActivity } from '../../../shared/decorators/log-activity.decorator';
import { ActivityAction, ActivitySeverity } from '../../../core/entities/activity_logs.entity';

import type { JwtUser } from '../../../shared/types/auth.types';
import { getUserIdFromReq } from '../../../shared/utils/auth.util';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('customer', 'caregiver', 'admin')
@Controller('notification-preferences')
export class NotificationPreferencesController {
  constructor(private readonly notificationPreferencesService: NotificationPreferencesService) {}

  // Use shared helper for extracting userId from request
  private getUserId(req: { user?: JwtUser }) {
    return getUserIdFromReq(req);
  }

  @Get()
  @ApiOperation({
    summary: '📋 Lấy tuỳ chọn thông báo của người dùng',
    description: 'Trả về tuỳ chọn thông báo hiện tại của người dùng đang đăng nhập',
  })
  @ApiResponse({
    status: 200,
    description: 'Tuỳ chọn thông báo của người dùng',
    type: NotificationPreference,
  })
  async getPreferences(@Req() req: { user?: JwtUser }) {
    const userId = getUserIdFromReq(req);
    return this.notificationPreferencesService.getPreferences(userId, userId);
  }

  @Put()
  @ApiOperation({
    summary: '✏️ Cập nhật tuỳ chọn thông báo',
    description: 'Cập nhật tuỳ chọn thông báo cho người dùng đang đăng nhập',
  })
  @ApiBody({ type: UpdateNotificationPreferencesDto })
  @ApiResponse({
    status: 200,
    description: 'Tuỳ chọn thông báo đã được cập nhật',
    type: NotificationPreference,
  })
  @LogActivity({
    action: 'update_notification_preferences',
    action_enum: ActivityAction.UPDATE,
    message: 'Cập nhật tuỳ chọn thông báo',
    resource_type: 'notification_preferences',
    resource_id: 'userId',
    severity: ActivitySeverity.MEDIUM,
  })
  async updatePreferences(
    @Body() updates: UpdateNotificationPreferencesDto,
    @Req() req: { user?: JwtUser },
  ) {
    const userId = getUserIdFromReq(req);
    return this.notificationPreferencesService.updatePreferences(userId, userId, updates);
  }

  @Put('quiet-hours')
  @ApiOperation({
    summary: '🌙 Thiết lập giờ yên tĩnh',
    description: 'Đặt khung giờ yên tĩnh, trong thời gian này sẽ không gửi thông báo',
  })
  @ApiBody({ type: SetQuietHoursDto })
  @ApiResponse({
    status: 200,
    description: 'Giờ yên tĩnh đã được cập nhật',
    type: NotificationPreference,
  })
  @LogActivity({
    action: 'set_quiet_hours',
    action_enum: ActivityAction.UPDATE,
    message: 'Thiết lập giờ yên tĩnh',
    resource_type: 'notification_preferences',
    resource_id: 'userId',
    severity: ActivitySeverity.LOW,
  })
  async setQuietHours(@Body() dto: SetQuietHoursDto, @Req() req: { user?: JwtUser }) {
    const userId = getUserIdFromReq(req);
    return this.notificationPreferencesService.setQuietHours(userId, userId, dto.start, dto.end);
  }

  @Delete('quiet-hours')
  @ApiOperation({
    summary: '❌ Tắt giờ yên tĩnh',
    description: 'Xoá thiết lập giờ yên tĩnh, cho phép gửi thông báo mọi lúc',
  })
  @ApiResponse({
    status: 200,
    description: 'Giờ yên tĩnh đã được tắt',
    type: NotificationPreference,
  })
  @LogActivity({
    action: 'disable_quiet_hours',
    action_enum: ActivityAction.UPDATE,
    message: 'Tắt giờ yên tĩnh',
    resource_type: 'notification_preferences',
    resource_id: 'userId',
    severity: ActivitySeverity.LOW,
  })
  async disableQuietHours(@Req() req: { user?: JwtUser }) {
    const userId = getUserIdFromReq(req);
    return this.notificationPreferencesService.disableQuietHours(userId, userId);
  }

  @Put('system-events/toggle')
  @ApiOperation({
    summary: '⚙️ Bật/tắt thông báo sự kiện hệ thống',
    description: 'Cho phép hoặc tắt thông báo sự kiện hệ thống (AI alerts)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Thông báo sự kiện hệ thống đã được bật/tắt',
    type: NotificationPreference,
  })
  @LogActivity({
    action: 'toggle_system_events_notifications',
    action_enum: ActivityAction.UPDATE,
    message: 'Bật/tắt thông báo sự kiện hệ thống',
    resource_type: 'notification_preferences',
    resource_id: 'userId',
    severity: ActivitySeverity.LOW,
  })
  async toggleSystemEvents(@Body('enabled') enabled: boolean, @Req() req: { user?: JwtUser }) {
    const userId = getUserIdFromReq(req);
    return this.notificationPreferencesService.toggleSystemEvents(userId, userId, enabled);
  }

  @Put('actor-messages/toggle')
  @ApiOperation({
    summary: '👥 Bật/tắt thông báo tin nhắn actor',
    description: 'Cho phép hoặc tắt thông báo tin nhắn giữa các actor (customer ↔ caregiver)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Thông báo tin nhắn actor đã được bật/tắt',
    type: NotificationPreference,
  })
  @LogActivity({
    action: 'toggle_actor_messages_notifications',
    action_enum: ActivityAction.UPDATE,
    message: 'Bật/tắt thông báo tin nhắn actor',
    resource_type: 'notification_preferences',
    resource_id: 'userId',
    severity: ActivitySeverity.LOW,
  })
  async toggleActorMessages(@Body('enabled') enabled: boolean, @Req() req: { user?: JwtUser }) {
    const userId = this.getUserId(req);
    return this.notificationPreferencesService.toggleActorMessages(userId, userId, enabled);
  }

  @Put('push/toggle')
  @ApiOperation({
    summary: '📲 Bật/tắt thông báo đẩy',
    description: 'Cho phép hoặc tắt tất cả thông báo đẩy (push notifications)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Thông báo đẩy đã được bật/tắt',
    type: NotificationPreference,
  })
  @LogActivity({
    action: 'toggle_push_notifications',
    action_enum: ActivityAction.UPDATE,
    message: 'Bật/tắt thông báo đẩy',
    resource_type: 'notification_preferences',
    resource_id: 'userId',
    severity: ActivitySeverity.LOW,
  })
  async togglePushNotifications(@Body('enabled') enabled: boolean, @Req() req: { user?: JwtUser }) {
    const userId = this.getUserId(req);
    return this.notificationPreferencesService.togglePush(userId, userId, enabled);
  }

  // Ticket notification preferences endpoints
  @Put('ticket-created')
  @ApiOperation({
    summary: '🎫 Bật/tắt thông báo ticket mới',
    description: 'Bật hoặc tắt thông báo khi có ticket mới được tạo',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Thông báo ticket mới đã được bật/tắt',
    type: NotificationPreference,
  })
  async toggleTicketCreated(@Body('enabled') enabled: boolean, @Req() req: { user?: JwtUser }) {
    const userId = this.getUserId(req);
    return this.notificationPreferencesService.toggleTicketCreated(userId, userId, enabled);
  }

  @Put('ticket-assigned')
  @ApiOperation({
    summary: '👤 Bật/tắt thông báo ticket được giao',
    description: 'Bật hoặc tắt thông báo khi ticket được giao cho agent',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Thông báo ticket được giao đã được bật/tắt',
    type: NotificationPreference,
  })
  async toggleTicketAssigned(@Body('enabled') enabled: boolean, @Req() req: { user?: JwtUser }) {
    const userId = this.getUserId(req);
    return this.notificationPreferencesService.toggleTicketAssigned(userId, userId, enabled);
  }

  @Put('ticket-status-changed')
  @ApiOperation({
    summary: '📊 Bật/tắt thông báo thay đổi trạng thái ticket',
    description: 'Bật hoặc tắt thông báo khi trạng thái ticket thay đổi',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Thông báo thay đổi trạng thái ticket đã được bật/tắt',
    type: NotificationPreference,
  })
  async toggleTicketStatusChanged(
    @Body('enabled') enabled: boolean,
    @Req() req: { user?: JwtUser },
  ) {
    const userId = this.getUserId(req);
    return this.notificationPreferencesService.toggleTicketStatusChanged(userId, userId, enabled);
  }

  @Put('ticket-message')
  @ApiOperation({
    summary: '💬 Bật/tắt thông báo tin nhắn ticket',
    description: 'Bật hoặc tắt thông báo khi có tin nhắn mới trong ticket',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Thông báo tin nhắn ticket đã được bật/tắt',
    type: NotificationPreference,
  })
  async toggleTicketMessage(@Body('enabled') enabled: boolean, @Req() req: { user?: JwtUser }) {
    const userId = this.getUserId(req);
    return this.notificationPreferencesService.toggleTicketMessage(userId, userId, enabled);
  }

  @Put('ticket-rated')
  @ApiOperation({
    summary: '⭐ Bật/tắt thông báo ticket được đánh giá',
    description: 'Bật hoặc tắt thông báo khi ticket được đánh giá bởi customer',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Thông báo ticket được đánh giá đã được bật/tắt',
    type: NotificationPreference,
  })
  async toggleTicketRated(@Body('enabled') enabled: boolean, @Req() req: { user?: JwtUser }) {
    const userId = this.getUserId(req);
    return this.notificationPreferencesService.toggleTicketRated(userId, userId, enabled);
  }

  @Put('ticket-closed')
  @ApiOperation({
    summary: '✅ Bật/tắt thông báo ticket được đóng',
    description: 'Bật hoặc tắt thông báo khi ticket được đóng',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Thông báo ticket được đóng đã được bật/tắt',
    type: NotificationPreference,
  })
  async toggleTicketClosed(@Body('enabled') enabled: boolean, @Req() req: { user?: JwtUser }) {
    const userId = this.getUserId(req);
    return this.notificationPreferencesService.toggleTicketClosed(userId, userId, enabled);
  }

  // System notification preferences endpoints
  @Put('fall-detection/toggle')
  @ApiOperation({
    summary: '🧍 Bật/tắt thông báo phát hiện té ngã',
    description: 'Bật hoặc tắt thông báo khi hệ thống phát hiện người dùng té ngã',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Thông báo phát hiện té ngã đã được bật/tắt',
    type: NotificationPreference,
  })
  @LogActivity({
    action: 'toggle_fall_detection_notifications',
    action_enum: ActivityAction.UPDATE,
    message: 'Bật/tắt thông báo phát hiện té ngã',
    resource_type: 'notification_preferences',
    resource_id: 'userId',
    severity: ActivitySeverity.LOW,
  })
  async toggleFallDetection(@Body('enabled') enabled: boolean, @Req() req: { user?: JwtUser }) {
    const userId = this.getUserId(req);
    return this.notificationPreferencesService.toggleFallDetection(userId, userId, enabled);
  }

  @Put('seizure-detection/toggle')
  @ApiOperation({
    summary: '🌀 Bật/tắt thông báo phát hiện co giật',
    description: 'Bật hoặc tắt thông báo khi hệ thống phát hiện co giật',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Thông báo phát hiện co giật đã được bật/tắt',
    type: NotificationPreference,
  })
  @LogActivity({
    action: 'toggle_seizure_detection_notifications',
    action_enum: ActivityAction.UPDATE,
    message: 'Bật/tắt thông báo phát hiện co giật',
    resource_type: 'notification_preferences',
    resource_id: 'userId',
    severity: ActivitySeverity.LOW,
  })
  async toggleSeizureDetection(@Body('enabled') enabled: boolean, @Req() req: { user?: JwtUser }) {
    const userId = this.getUserId(req);
    return this.notificationPreferencesService.toggleSeizureDetection(userId, userId, enabled);
  }

  @Put('abnormal-behavior/toggle')
  @ApiOperation({
    summary: '🤖 Bật/tắt thông báo hành vi bất thường',
    description: 'Bật hoặc tắt thông báo khi hệ thống phát hiện hành vi bất thường',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Thông báo hành vi bất thường đã được bật/tắt',
    type: NotificationPreference,
  })
  @LogActivity({
    action: 'toggle_abnormal_behavior_notifications',
    action_enum: ActivityAction.UPDATE,
    message: 'Bật/tắt thông báo hành vi bất thường',
    resource_type: 'notification_preferences',
    resource_id: 'userId',
    severity: ActivitySeverity.LOW,
  })
  async toggleAbnormalBehavior(@Body('enabled') enabled: boolean, @Req() req: { user?: JwtUser }) {
    const userId = this.getUserId(req);
    return this.notificationPreferencesService.toggleAbnormalBehavior(userId, userId, enabled);
  }

  @Put('emergency/toggle')
  @ApiOperation({
    summary: '🚨 Bật/tắt thông báo khẩn cấp',
    description: 'Bật hoặc tắt thông báo khẩn cấp từ hệ thống',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Thông báo khẩn cấp đã được bật/tắt',
    type: NotificationPreference,
  })
  @LogActivity({
    action: 'toggle_emergency_notifications',
    action_enum: ActivityAction.UPDATE,
    message: 'Bật/tắt thông báo khẩn cấp',
    resource_type: 'notification_preferences',
    resource_id: 'userId',
    severity: ActivitySeverity.LOW,
  })
  async toggleEmergency(@Body('enabled') enabled: boolean, @Req() req: { user?: JwtUser }) {
    const userId = this.getUserId(req);
    return this.notificationPreferencesService.toggleEmergency(userId, userId, enabled);
  }

  @Put('device-offline/toggle')
  @ApiOperation({
    summary: '📴 Bật/tắt thông báo thiết bị offline',
    description: 'Bật hoặc tắt thông báo khi thiết bị camera hoặc sensor offline',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Thông báo thiết bị offline đã được bật/tắt',
    type: NotificationPreference,
  })
  @LogActivity({
    action: 'toggle_device_offline_notifications',
    action_enum: ActivityAction.UPDATE,
    message: 'Bật/tắt thông báo thiết bị offline',
    resource_type: 'notification_preferences',
    resource_id: 'userId',
    severity: ActivitySeverity.LOW,
  })
  async toggleDeviceOffline(@Body('enabled') enabled: boolean, @Req() req: { user?: JwtUser }) {
    const userId = this.getUserId(req);
    return this.notificationPreferencesService.toggleDeviceOffline(userId, userId, enabled);
  }

  @Put('payment-failed/toggle')
  @ApiOperation({
    summary: '💳 Bật/tắt thông báo thanh toán thất bại',
    description: 'Bật hoặc tắt thông báo khi thanh toán subscription thất bại',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Thông báo thanh toán thất bại đã được bật/tắt',
    type: NotificationPreference,
  })
  @LogActivity({
    action: 'toggle_payment_failed_notifications',
    action_enum: ActivityAction.UPDATE,
    message: 'Bật/tắt thông báo thanh toán thất bại',
    resource_type: 'notification_preferences',
    resource_id: 'userId',
    severity: ActivitySeverity.LOW,
  })
  async togglePaymentFailed(@Body('enabled') enabled: boolean, @Req() req: { user?: JwtUser }) {
    const userId = this.getUserId(req);
    return this.notificationPreferencesService.togglePaymentFailed(userId, userId, enabled);
  }

  @Put('subscription-expiry/toggle')
  @ApiOperation({
    summary: '⏰ Bật/tắt thông báo hết hạn subscription',
    description: 'Bật hoặc tắt thông báo khi subscription sắp hết hạn',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Thông báo hết hạn subscription đã được bật/tắt',
    type: NotificationPreference,
  })
  @LogActivity({
    action: 'toggle_subscription_expiry_notifications',
    action_enum: ActivityAction.UPDATE,
    message: 'Bật/tắt thông báo hết hạn subscription',
    resource_type: 'notification_preferences',
    resource_id: 'userId',
    severity: ActivitySeverity.LOW,
  })
  async toggleSubscriptionExpiry(
    @Body('enabled') enabled: boolean,
    @Req() req: { user?: JwtUser },
  ) {
    const userId = this.getUserId(req);
    return this.notificationPreferencesService.toggleSubscriptionExpiry(userId, userId, enabled);
  }

  @Put('health-check-reminder/toggle')
  @ApiOperation({
    summary: '🏥 Bật/tắt thông báo nhắc nhở kiểm tra sức khỏe',
    description: 'Bật hoặc tắt thông báo nhắc nhở kiểm tra sức khỏe định kỳ',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Thông báo nhắc nhở kiểm tra sức khỏe đã được bật/tắt',
    type: NotificationPreference,
  })
  @LogActivity({
    action: 'toggle_health_check_reminder_notifications',
    action_enum: ActivityAction.UPDATE,
    message: 'Bật/tắt thông báo nhắc nhở kiểm tra sức khỏe',
    resource_type: 'notification_preferences',
    resource_id: 'userId',
    severity: ActivitySeverity.LOW,
  })
  async toggleHealthCheckReminder(
    @Body('enabled') enabled: boolean,
    @Req() req: { user?: JwtUser },
  ) {
    const userId = this.getUserId(req);
    return this.notificationPreferencesService.toggleHealthCheckReminder(userId, userId, enabled);
  }

  @Put('appointment-reminder/toggle')
  @ApiOperation({
    summary: '📅 Bật/tắt thông báo nhắc nhở lịch hẹn',
    description: 'Bật hoặc tắt thông báo nhắc nhở lịch hẹn y tế',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Thông báo nhắc nhở lịch hẹn đã được bật/tắt',
    type: NotificationPreference,
  })
  @LogActivity({
    action: 'toggle_appointment_reminder_notifications',
    action_enum: ActivityAction.UPDATE,
    message: 'Bật/tắt thông báo nhắc nhở lịch hẹn',
    resource_type: 'notification_preferences',
    resource_id: 'userId',
    severity: ActivitySeverity.LOW,
  })
  async toggleAppointmentReminder(
    @Body('enabled') enabled: boolean,
    @Req() req: { user?: JwtUser },
  ) {
    const userId = this.getUserId(req);
    return this.notificationPreferencesService.toggleAppointmentReminder(userId, userId, enabled);
  }

  // User notification preferences endpoints
  @Put('permission-request/toggle')
  @ApiOperation({
    summary: '🔑 Bật/tắt thông báo yêu cầu quyền truy cập',
    description: 'Bật hoặc tắt thông báo khi caregiver yêu cầu quyền truy cập dữ liệu',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Thông báo yêu cầu quyền truy cập đã được bật/tắt',
    type: NotificationPreference,
  })
  @LogActivity({
    action: 'toggle_permission_request_notifications',
    action_enum: ActivityAction.UPDATE,
    message: 'Bật/tắt thông báo yêu cầu quyền truy cập',
    resource_type: 'notification_preferences',
    resource_id: 'userId',
    severity: ActivitySeverity.LOW,
  })
  async togglePermissionRequest(@Body('enabled') enabled: boolean, @Req() req: { user?: JwtUser }) {
    const userId = this.getUserId(req);
    return this.notificationPreferencesService.togglePermissionRequest(userId, userId, enabled);
  }

  @Put('event-update/toggle')
  @ApiOperation({
    summary: '📝 Bật/tắt thông báo cập nhật sự kiện',
    description: 'Bật hoặc tắt thông báo khi có yêu cầu cập nhật hoặc duyệt sự kiện',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Thông báo cập nhật sự kiện đã được bật/tắt',
    type: NotificationPreference,
  })
  @LogActivity({
    action: 'toggle_event_update_notifications',
    action_enum: ActivityAction.UPDATE,
    message: 'Bật/tắt thông báo cập nhật sự kiện',
    resource_type: 'notification_preferences',
    resource_id: 'userId',
    severity: ActivitySeverity.LOW,
  })
  async toggleEventUpdate(@Body('enabled') enabled: boolean, @Req() req: { user?: JwtUser }) {
    const userId = this.getUserId(req);
    return this.notificationPreferencesService.toggleEventUpdate(userId, userId, enabled);
  }

  @Put('caregiver-invitation/toggle')
  @ApiOperation({
    summary: '👥 Bật/tắt thông báo lời mời caregiver',
    description: 'Bật hoặc tắt thông báo khi có lời mời làm caregiver hoặc phản hồi lời mời',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Thông báo lời mời caregiver đã được bật/tắt',
    type: NotificationPreference,
  })
  @LogActivity({
    action: 'toggle_caregiver_invitation_notifications',
    action_enum: ActivityAction.UPDATE,
    message: 'Bật/tắt thông báo lời mời caregiver',
    resource_type: 'notification_preferences',
    resource_id: 'userId',
    severity: ActivitySeverity.LOW,
  })
  async toggleCaregiverInvitation(
    @Body('enabled') enabled: boolean,
    @Req() req: { user?: JwtUser },
  ) {
    const userId = this.getUserId(req);
    return this.notificationPreferencesService.toggleCaregiverInvitation(userId, userId, enabled);
  }
}
