import { IsEnum, IsOptional, IsString, IsUUID, IsObject } from 'class-validator';
import { Transform } from 'class-transformer';
import { parseJsonOrUndefined } from '../../../shared/utils';
import { EventTypeEnum, EventStatusEnum } from '../../../core/entities/events.entity';

export class CreateEventWithNotificationDto {
  @IsUUID()
  user_id!: string;

  @IsUUID()
  camera_id!: string;

  @IsOptional()
  @IsUUID()
  snapshot_id?: string;

  @IsEnum(EventTypeEnum)
  event_type!: EventTypeEnum;

  @IsOptional()
  @IsString()
  confidence_score?: string;

  @IsOptional()
  @IsString()
  reliability_score?: string;

  @IsOptional()
  @IsEnum(EventStatusEnum)
  status?: EventStatusEnum;

  @IsOptional()
  @IsString()
  detected_at?: string;

  @IsOptional()
  @IsObject()
  @Transform(parseJsonOrUndefined)
  metadata?: Record<string, any>;
}
