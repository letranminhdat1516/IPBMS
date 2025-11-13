import {
  IsOptional,
  IsString,
  IsEnum,
  IsNumber,
  IsUrl,
  IsIP,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateCameraDto {
  @IsOptional()
  @IsString()
  camera_name?: string;

  // @IsOptional()s
  // @IsEnum(camera_type_enum)
  // camera_type?: camera_type_enum;

  @IsOptional()
  @IsString()
  @IsIP(4)
  ip_address?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(65535)
  port?: number;

  @IsOptional()
  @IsUrl()
  rtsp_url?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  location_in_room?: string;

  @IsOptional()
  @IsString()
  resolution?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(60)
  fps?: number;

  // @IsOptional()
  // @IsEnum(camera_status_enum)
  // status?: camera_status_enum;

  @IsOptional()
  @IsBoolean()
  is_online?: boolean;

  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  last_ping?: Date;

  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  last_heartbeat_at?: Date;
}
