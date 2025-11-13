import { IsEnum, IsObject, IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { parseJsonOrUndefined } from '../../../shared/utils';

export class DeviceSyncMessageDto {
  @ApiProperty({
    enum: ['sync', 'command', 'data', 'notification'],
    description: 'Loại thông điệp',
  })
  @IsEnum(['sync', 'command', 'data', 'notification'])
  type!: 'sync' | 'command' | 'data' | 'notification';

  @ApiProperty({
    description: 'Dữ liệu payload của thông điệp',
  })
  @Transform(parseJsonOrUndefined)
  @IsObject()
  payload!: any;

  @ApiPropertyOptional({
    enum: ['low', 'normal', 'high'],
    default: 'normal',
    description: 'Mức độ ưu tiên của thông điệp',
  })
  @IsOptional()
  @IsEnum(['low', 'normal', 'high'])
  priority?: 'low' | 'normal' | 'high';

  @ApiPropertyOptional({
    type: Number,
    description: 'Thời gian sống (TTL) của thông điệp tính bằng giây',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(86400)
  ttl?: number;
}

export class DeviceSyncOptionsDto {
  @ApiPropertyOptional({
    type: Boolean,
    default: true,
    description: 'Có fallback sang FCM nếu WebSocket thất bại',
  })
  @IsOptional()
  fallbackToFCM?: boolean;

  @ApiPropertyOptional({
    type: Boolean,
    default: false,
    description: 'Yêu cầu thiết bị phải online khi nhận thông điệp',
  })
  @IsOptional()
  requireOnline?: boolean;

  @ApiPropertyOptional({
    type: Boolean,
    default: false,
    description: 'Phát broadcast tới tất cả thiết bị',
  })
  @IsOptional()
  broadcast?: boolean;
}

export class SyncDataDto {
  @ApiProperty({
    description: 'Loại dữ liệu được đồng bộ',
  })
  @IsString()
  dataType!: string;

  @ApiProperty({
    description: 'Payload dữ liệu cần đồng bộ',
  })
  @Transform(parseJsonOrUndefined)
  @IsObject()
  data!: any;

  @ApiPropertyOptional({
    description: 'ID thiết bị đích (tùy chọn, mặc định dùng deviceId param)',
  })
  @IsOptional()
  @IsString()
  targetDeviceId?: string;
}

export class SendCommandDto {
  @ApiProperty({
    description: 'Tên lệnh cần thực thi',
  })
  @IsString()
  command!: string;

  @ApiPropertyOptional({
    description: 'Tham số truyền kèm lệnh',
  })
  @IsOptional()
  @Transform(parseJsonOrUndefined)
  @IsObject()
  params?: any;
}
