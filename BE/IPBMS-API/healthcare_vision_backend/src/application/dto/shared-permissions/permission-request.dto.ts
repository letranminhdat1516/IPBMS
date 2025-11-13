import {
  IsUUID,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsInt,
  IsArray,
  IsString,
  IsIn,
  ValidateIf,
  Min,
  IsUUID as IsUUIDv4,
} from 'class-validator';
import { Type } from 'class-transformer';

/** ---- Enums ---- */
export enum PermissionRequestType {
  STREAM_VIEW = 'stream_view',
  ALERT_READ = 'alert_read',
  ALERT_ACK = 'alert_ack',
  PROFILE_VIEW = 'profile_view',
  LOG_ACCESS_DAYS = 'log_access_days',
  REPORT_ACCESS_DAYS = 'report_access_days',
  NOTIFICATION_CHANNEL = 'notification_channel',
}

export enum PermissionRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  REVOKED = 'REVOKED',
}

export enum PermissionScope {
  READ = 'read',
  WRITE = 'write',
  READ_WRITE = 'read_write',
}

/** ---- Create ---- */
export class CreatePermissionRequestDto {
  @IsUUID('4')
  customerId!: string;

  @IsUUID('4')
  caregiverId!: string;

  @IsEnum(PermissionRequestType)
  type!: PermissionRequestType;

  @ValidateIf((o) =>
    [
      PermissionRequestType.STREAM_VIEW,
      PermissionRequestType.ALERT_READ,
      PermissionRequestType.ALERT_ACK,
      PermissionRequestType.PROFILE_VIEW,
    ].includes(o.type),
  )
  @IsBoolean()
  requested_bool?: boolean;

  @ValidateIf((o) =>
    [PermissionRequestType.LOG_ACCESS_DAYS, PermissionRequestType.REPORT_ACCESS_DAYS].includes(
      o.type,
    ),
  )
  @Type(() => Number)
  @IsInt()
  @Min(0)
  requested_days?: number;

  @ValidateIf((o) => o.type === PermissionRequestType.NOTIFICATION_CHANNEL)
  @IsArray()
  @IsIn(['push', 'sms', 'call'], { each: true })
  requested_channels?: string[];

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsEnum(PermissionScope)
  scope?: PermissionScope | null;
}

/** ---- Approve / Reject ---- */
export class ApprovePermissionRequestDto {
  @IsOptional()
  @IsString()
  decisionReason?: string;

  @IsOptional()
  override?: boolean = true; // thực tế bạn vẫn nên default trong service: (body.override ?? true)
}

export class RejectPermissionRequestDto {
  @IsOptional()
  @IsString()
  decisionReason?: string;
}

/** ---- Bulk ---- */
export class BulkDecisionDto {
  @IsArray()
  @IsUUID('4', { each: true })
  ids!: string[];

  @IsOptional()
  @IsString()
  decisionReason?: string;

  @IsOptional()
  override?: boolean = true;
}

/** ---- (C) Detail + history: response types (optional nhưng useful cho typing) ---- */
export class PermissionRequestEventDto {
  @IsEnum(PermissionRequestStatus)
  status!: PermissionRequestStatus;

  @IsString()
  at!: string; // ISO

  @IsOptional()
  @IsUUID('4')
  by?: string | null;

  @IsOptional()
  @IsString()
  reason?: string | null;
}

export class PermissionRequestDetailDto {
  @IsUUID('4')
  id!: string;

  @IsEnum(PermissionRequestType)
  type!: PermissionRequestType;

  // value có thể là boolean | number | string[] → để any cho linh hoạt
  // nếu muốn strict có thể làm union + ValidateIf nâng cao
  value!: any;

  @IsOptional()
  @IsEnum(PermissionScope)
  scope?: PermissionScope | null;

  @IsEnum(PermissionRequestStatus)
  status!: PermissionRequestStatus;

  @IsOptional()
  @IsString()
  reason?: string | null;

  @IsString()
  createdAt!: string;

  @IsOptional()
  @IsString()
  decidedAt?: string | null;

  @IsOptional()
  @IsUUID('4')
  decidedBy?: string | null;

  @IsOptional()
  @IsString()
  decisionReason?: string | null;

  @IsOptional()
  history?: PermissionRequestEventDto[];

  /** bổ sung context để FE không phải join */
  @IsOptional()
  @IsUUID('4')
  caregiver_id?: string;

  @IsOptional()
  @IsUUID('4')
  customer_id?: string;
}

/** ---- (D) Reopen ---- */
export class ReopenPermissionRequestDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

/** ---- (A/B) List filters (optional) ---- */
export class ListRequestsQueryDto {
  @IsOptional()
  @IsEnum(PermissionRequestStatus)
  status?: PermissionRequestStatus; // PENDING / APPROVED / REJECTED / REVOKED

  // có thể mở rộng: type / caregiverId / date range...
  @IsOptional()
  @IsEnum(PermissionRequestType)
  type?: PermissionRequestType;

  @IsOptional()
  @IsUUID('4')
  caregiverId?: string;
}
