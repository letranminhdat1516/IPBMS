import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsString, IsObject, IsOptional, IsDateString, IsNumber } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { parseJsonOrUndefined } from '../../../shared/utils';

export class UpdateNotificationDto {
  @ApiProperty({ example: 'uuid-alert', description: 'ID cảnh báo (Alert ID)', required: false })
  @IsUUID()
  @IsOptional()
  alert_id?: string;

  @ApiProperty({
    example: 'uuid-user',
    description: 'ID người dùng nhận thông báo',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  user_id?: string;

  @ApiProperty({
    example: 'email',
    description: 'Loại thông báo (ví dụ: email, push, sms)',
    required: false,
  })
  @IsString()
  @IsOptional()
  notification_type?: string;

  @ApiProperty({ example: 'Nội dung thông báo', description: 'Nội dung tin nhắn', required: false })
  @IsString()
  @IsOptional()
  message?: string;

  @ApiProperty({
    example: {},
    description: 'Dữ liệu đi kèm để phục vụ việc gửi thông báo',
    required: false,
  })
  @IsObject()
  @IsOptional()
  @Transform(parseJsonOrUndefined)
  delivery_data?: object;

  @ApiProperty({
    example: 'pending',
    description: 'Trạng thái thông báo (pending, sent, delivered, failed)',
    required: false,
  })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiProperty({
    example: '2024-06-01T12:00:00Z',
    description: 'Thời điểm gửi thông báo',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  @Type(() => Date)
  sent_at?: Date;

  @ApiProperty({
    example: '2024-06-01T12:05:00Z',
    description: 'Thời điểm thông báo được đọc',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  @Type(() => Date)
  read_at?: Date;

  @ApiProperty({ example: 0, description: 'Số lần thử gửi lại (retry count)', required: false })
  @IsNumber()
  @IsOptional()
  retry_count?: number;

  @ApiProperty({
    example: 'Lỗi khi gửi thông báo',
    description: 'Thông điệp lỗi (nếu có)',
    required: false,
  })
  @IsString()
  @IsOptional()
  error_message?: string;
}
