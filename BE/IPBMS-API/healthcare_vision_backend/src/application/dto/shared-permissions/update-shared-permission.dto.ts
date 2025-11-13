import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsArray,
  IsIn,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class PermissionsDto {
  @IsOptional()
  @IsBoolean()
  stream_view?: boolean;

  @IsOptional()
  @IsBoolean()
  alert_read?: boolean;

  @IsOptional()
  @IsBoolean()
  alert_ack?: boolean;

  @IsOptional()
  @IsBoolean()
  profile_view?: boolean;

  @IsOptional()
  @IsInt()
  log_access_days?: number;

  @IsOptional()
  @IsInt()
  report_access_days?: number;

  @IsOptional()
  @IsArray()
  @IsIn(['push', 'sms', 'call'], { each: true })
  notification_channel?: string[];
}

export class UpdateSharedPermissionDto {
  @IsOptional()
  @IsString()
  caregiver_username?: string;

  @IsOptional()
  @IsString()
  caregiver_phone?: string;

  @IsOptional()
  @IsString()
  caregiver_full_name?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PermissionsDto)
  permissions?: PermissionsDto;

  // Legacy support for direct fields (backward compatibility)
  @IsOptional()
  @IsBoolean()
  stream_view?: boolean;

  @IsOptional()
  @IsBoolean()
  alert_read?: boolean;

  @IsOptional()
  @IsBoolean()
  alert_ack?: boolean;

  @IsOptional()
  @IsBoolean()
  profile_view?: boolean;

  @IsOptional()
  @IsInt()
  log_access_days?: number;

  @IsOptional()
  @IsInt()
  report_access_days?: number;

  @IsOptional()
  @IsArray()
  @IsIn(['push', 'sms', 'call'], { each: true })
  notification_channel?: string[];
}
