import { IsBoolean, IsOptional, IsString, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateNotificationPreferencesDto {
  @ApiPropertyOptional({
    description: 'Bật/tắt thông báo sự kiện hệ thống (cảnh báo AI)',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  system_events_enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Bật/tắt thông báo tin nhắn giữa các actor (người dùng với nhau)',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  actor_messages_enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Bật/tắt thông báo đẩy (push notification)',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  push_notifications_enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Bật/tắt thông báo qua email (dự kiến dùng trong tương lai)',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  email_notifications_enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Giờ bắt đầu chế độ yên lặng (định dạng HH:MM)',
    example: '22:00',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Thời gian phải có định dạng HH:MM',
  })
  quiet_hours_start?: string;

  @ApiPropertyOptional({
    description: 'Giờ kết thúc chế độ yên lặng (định dạng HH:MM)',
    example: '08:00',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Thời gian phải có định dạng HH:MM',
  })
  quiet_hours_end?: string;

  @ApiPropertyOptional({
    description: 'Bật/tắt thông báo phát hiện té ngã',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  fall_detection_enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Bật/tắt thông báo phát hiện co giật',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  seizure_detection_enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Bật/tắt thông báo phát hiện hành vi bất thường',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  abnormal_behavior_enabled?: boolean;

  // Additional system notification preferences
  @ApiPropertyOptional({
    description: 'Bật/tắt thông báo khẩn cấp',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  emergency_enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Bật/tắt thông báo thiết bị offline',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  device_offline_enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Bật/tắt thông báo thanh toán thất bại',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  payment_failed_enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Bật/tắt thông báo hết hạn subscription',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  subscription_expiry_enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Bật/tắt thông báo nhắc nhở kiểm tra sức khỏe',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  health_check_reminder_enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Bật/tắt thông báo nhắc nhở lịch hẹn',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  appointment_reminder_enabled?: boolean;

  // User notification preferences
  @ApiPropertyOptional({
    description: 'Bật/tắt thông báo yêu cầu quyền truy cập',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  permission_request_enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Bật/tắt thông báo cập nhật sự kiện',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  event_update_enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Bật/tắt thông báo lời mời caregiver',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  caregiver_invitation_enabled?: boolean;

  // Ticket notification preferences
  @ApiPropertyOptional({
    description: 'Bật/tắt thông báo khi ticket mới được tạo',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  ticket_created_enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Bật/tắt thông báo khi ticket được phân công',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  ticket_assigned_enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Bật/tắt thông báo khi trạng thái ticket thay đổi',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  ticket_status_changed_enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Bật/tắt thông báo khi có tin nhắn mới trong ticket',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  ticket_message_enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Bật/tắt thông báo khi ticket được đánh giá',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  ticket_rated_enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Bật/tắt thông báo khi ticket được đóng',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  ticket_closed_enabled?: boolean;
}

export class SetQuietHoursDto {
  @ApiPropertyOptional({
    description: 'Giờ bắt đầu chế độ yên lặng (định dạng HH:MM)',
    example: '22:00',
  })
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Thời gian phải có định dạng HH:MM',
  })
  start!: string;

  @ApiPropertyOptional({
    description: 'Giờ kết thúc chế độ yên lặng (định dạng HH:MM)',
    example: '08:00',
  })
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Thời gian phải có định dạng HH:MM',
  })
  end!: string;
}

export class UpdateSystemNotificationDefaultsDto {
  @ApiPropertyOptional({
    description: 'Bật/tắt thông báo sự kiện hệ thống (cảnh báo AI) mặc định',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  system_events_enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Bật/tắt thông báo tin nhắn giữa các actor (người dùng với nhau) mặc định',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  actor_messages_enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Bật/tắt thông báo đẩy (push notification) mặc định',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  push_notifications_enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Bật/tắt thông báo qua email mặc định (dự kiến dùng trong tương lai)',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  email_notifications_enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Bật/tắt thông báo phát hiện té ngã mặc định',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  fall_detection_enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Bật/tắt thông báo phát hiện co giật mặc định',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  seizure_detection_enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Bật/tắt thông báo phát hiện hành vi bất thường mặc định',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  abnormal_behavior_enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Bật/tắt thông báo khẩn cấp mặc định',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  emergency_enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Bật/tắt thông báo thiết bị offline mặc định',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  device_offline_enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Bật/tắt thông báo thanh toán thất bại mặc định',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  payment_failed_enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Bật/tắt thông báo hết hạn subscription mặc định',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  subscription_expiry_enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Bật/tắt thông báo nhắc nhở kiểm tra sức khỏe mặc định',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  health_check_reminder_enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Bật/tắt thông báo nhắc nhở lịch hẹn mặc định',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  appointment_reminder_enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Bật/tắt thông báo yêu cầu quyền truy cập mặc định',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  permission_request_enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Bật/tắt thông báo cập nhật sự kiện mặc định',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  event_update_enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Bật/tắt thông báo lời mời caregiver mặc định',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  caregiver_invitation_enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Bật/tắt thông báo khi ticket mới được tạo mặc định',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  ticket_created_enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Bật/tắt thông báo khi ticket được phân công mặc định',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  ticket_assigned_enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Bật/tắt thông báo khi trạng thái ticket thay đổi mặc định',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  ticket_status_changed_enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Bật/tắt thông báo khi có tin nhắn mới trong ticket mặc định',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  ticket_message_enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Bật/tắt thông báo khi ticket được đánh giá mặc định',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  ticket_rated_enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Bật/tắt thông báo khi ticket được đóng mặc định',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  ticket_closed_enabled?: boolean;
}
