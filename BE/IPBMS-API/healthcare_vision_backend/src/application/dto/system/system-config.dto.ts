import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
  ArrayNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CameraSettingsDto {
  @IsBoolean()
  @ApiProperty({ example: true })
  enable!: boolean;

  @IsInt()
  @Min(0)
  @ApiProperty({ example: 4, description: 'Number of cameras allowed' })
  count!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  @ApiProperty({ example: 80, minimum: 0, maximum: 100, required: false })
  quality_percent?: number;

  @IsOptional()
  @IsIn(['low', 'medium', 'high'])
  @ApiProperty({ example: 'high', enum: ['low', 'medium', 'high'], required: false })
  quality?: 'low' | 'medium' | 'high';

  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'legacy config', required: false })
  note?: string;
}

export class ImageConfigDto {
  @IsBoolean()
  @ApiProperty({ example: true })
  enable!: boolean;

  @IsIn(['low', 'medium', 'high'])
  @ApiProperty({ example: 'medium', enum: ['low', 'medium', 'high'] })
  quality!: 'low' | 'medium' | 'high';

  @IsInt()
  @Min(0)
  @ApiProperty({ example: 50 })
  retention_days_normal!: number;

  @IsInt()
  @Min(0)
  @ApiProperty({ example: 90 })
  retention_days_alert!: number;
}

export class NotificationEnabledDto {
  @IsBoolean()
  @ApiProperty({ example: true })
  call!: boolean;

  @IsBoolean()
  @ApiProperty({ example: true })
  sms!: boolean;

  @IsBoolean()
  @ApiProperty({ example: true })
  push!: boolean;

  @IsBoolean()
  @ApiProperty({ example: false })
  email!: boolean;
}

export class NotificationChannelsConfigDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(['call', 'sms', 'push', 'email'], { each: true })
  @ApiProperty({
    example: ['call', 'sms', 'push'],
    isArray: true,
    enum: ['call', 'sms', 'push', 'email'],
  })
  priority!: Array<'call' | 'sms' | 'push' | 'email'>;

  @ValidateNested()
  @Type(() => NotificationEnabledDto)
  @ApiProperty({ type: NotificationEnabledDto })
  enabled!: NotificationEnabledDto;

  @IsOptional()
  @IsInt()
  @Min(0)
  @ApiProperty({ example: 60, required: false })
  throttle_seconds?: number;

  @IsOptional()
  @ApiProperty({ description: 'Optional per-provider channel details', required: false })
  channels?: any;
}

export class AIFrequencyConfigDto {
  @IsBoolean()
  @ApiProperty({ example: true })
  enabled!: boolean;

  @IsInt()
  @Min(0)
  @Max(100)
  @ApiProperty({ example: 50, minimum: 0, maximum: 100 })
  sensitivity!: number;

  @IsInt()
  @Min(1)
  @ApiProperty({ example: 10, description: 'Interval between detections in seconds' })
  detection_interval_seconds!: number;

  @IsOptional()
  @ApiProperty({ description: 'Per-camera overrides keyed by camera id', required: false })
  per_camera_overrides?: Record<string, any>;
}

export class LogS3ConfigDto {
  @IsString()
  @ApiProperty({ example: 'my-logs-bucket' })
  bucket!: string;

  @IsString()
  @ApiProperty({ example: 'ap-southeast-1' })
  region!: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'logs/app', required: false })
  prefix?: string;
}

export class LogConfigDto {
  @IsInt()
  @Min(0)
  @ApiProperty({ example: 365 })
  retention_days!: number;

  @IsIn(['local', 's3'])
  @ApiProperty({ example: 's3', enum: ['local', 's3'] })
  storage!: 'local' | 's3';

  @IsOptional()
  @ValidateNested()
  @Type(() => LogS3ConfigDto)
  @ApiProperty({ type: LogS3ConfigDto, required: false })
  s3?: LogS3ConfigDto;
}

export type KnownSystemSettingKey =
  | 'camera'
  | 'image_config'
  | 'notification_channels'
  | 'ai_frequency'
  | 'log_config'
  | 'emergency_protocols';

export type KnownSystemSettingValue =
  | CameraSettingsDto
  | ImageConfigDto
  | NotificationChannelsConfigDto
  | AIFrequencyConfigDto
  | LogConfigDto;

export type EmergencyProtocol = {
  id?: number;
  name: string;
  steps: string[];
};

export class EmergencyProtocolDto {
  @ApiProperty({ example: 1, required: false })
  id?: number;

  @ApiProperty({ example: 'Default protocol' })
  name!: string;

  @ApiProperty({
    isArray: true,
    example: [
      '{"type":"detect","title":"Bước 1","desc":"..."}',
      '{"type":"notify","title":"Bước 2","desc":"..."}',
    ],
    description: 'Array of steps serialized as JSON strings',
  })
  steps!: string[];
}

export class SettingUpdateResponseDto {
  @ApiProperty({ example: 'camera' })
  key!: string;

  @ApiProperty({ example: {}, description: 'Stored value (parsed JSON when applicable)' })
  value!: any;

  @ApiProperty({ example: new Date().toISOString() })
  updated_at!: string;
}

export class CreateOrUpdateSettingDto {
  @ApiProperty({
    example: 'subscription.send_on_expiry_day',
    description: 'Tên key của setting (duy nhất)',
  })
  setting_key!: string;

  @ApiProperty({ example: 'true', description: 'Giá trị của setting (stringified)' })
  setting_value!: string;

  @ApiProperty({
    example: 'Có gửi email vào đúng ngày gói hết hạn hay không (D-0)',
    required: false,
  })
  description?: string;

  @ApiProperty({
    example: 'boolean',
    description: 'Kiểu dữ liệu của giá trị',
    enum: ['string', 'int', 'boolean', 'json'],
    default: 'string',
    required: false,
  })
  data_type?: string;

  @ApiProperty({
    example: 'subscription',
    description: 'Nhóm cấu hình (category)',
    required: false,
  })
  category?: string;

  @ApiProperty({ example: false, description: 'Có mã hoá giá trị hay không', required: false })
  is_encrypted?: boolean;

  @ApiProperty({ example: 'admin-uuid', description: 'ID của người cập nhật' })
  updated_by!: string;
}
