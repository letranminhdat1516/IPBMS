import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsUUID,
  IsString,
  IsObject,
  IsOptional,
  IsDateString,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateNotificationDto {
  @ApiProperty({ example: 'uuid-alert', description: 'ID cảnh báo (Alert ID)' })
  @IsUUID()
  @IsNotEmpty()
  alert_id!: string;

  @ApiProperty({ example: 'uuid-user', description: 'ID người dùng nhận thông báo' })
  @IsUUID()
  @IsNotEmpty()
  user_id!: string;

  @ApiProperty({ example: 'email', description: 'Loại thông báo (ví dụ: email, push, sms)' })
  @IsString()
  @IsOptional()
  notification_type?: string;

  @ApiProperty({ example: 'Nội dung tin nhắn', description: 'Nội dung thông báo' })
  @IsString()
  @IsOptional()
  message?: string;

  @ApiProperty({ example: {}, description: 'Dữ liệu kèm theo phục vụ việc gửi thông báo' })
  @IsObject()
  @IsOptional()
  delivery_data?: object;

  @ApiProperty({
    example: 'pending',
    description: 'Trạng thái thông báo (pending, sent, delivered, failed)',
  })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiProperty({ example: '2024-06-01T12:00:00Z', description: 'Thời điểm gửi thông báo' })
  @IsDateString()
  @IsOptional()
  @Type(() => Date)
  sent_at?: Date;

  @ApiProperty({ example: '2024-06-01T12:05:00Z', description: 'Thời điểm thông báo được nhận' })
  @IsDateString()
  @IsOptional()
  @Type(() => Date)
  delivered_at?: Date;

  @ApiProperty({ example: 0, description: 'Số lần thử gửi lại (retry)' })
  @IsNumber()
  @IsOptional()
  retry_count?: number;

  @ApiProperty({ example: 'Lỗi khi gửi thông báo', description: 'Thông điệp lỗi (nếu có)' })
  @IsString()
  @IsOptional()
  error_message?: string;
}
