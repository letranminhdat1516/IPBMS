import { Transform } from 'class-transformer';
import { parseJsonOrUndefined, emptyToUndefined } from '../../../shared/utils';
import { IsEnum, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';
import { EventStatusEnum, EventTypeEnum } from '../../../core/entities/events.entity';

export class AlarmTriggerDto {
  @IsOptional()
  @IsUUID()
  @Transform(emptyToUndefined)
  event_id?: string;

  @IsOptional()
  @IsUUID()
  @Transform(emptyToUndefined)
  user_id?: string;

  @IsOptional()
  @IsUUID()
  @Transform(emptyToUndefined)
  camera_id?: string;

  @IsOptional()
  @IsEnum(EventTypeEnum)
  @Transform(emptyToUndefined)
  event_type?: EventTypeEnum;

  @IsOptional()
  @IsEnum(EventStatusEnum)
  @Transform(emptyToUndefined)
  status?: EventStatusEnum;

  @IsOptional()
  @IsString()
  @Transform(emptyToUndefined)
  detected_at?: string;

  @IsOptional()
  @IsObject()
  @Transform(parseJsonOrUndefined)
  metadata?: Record<string, any>;

  @IsOptional()
  @IsString()
  @Transform(emptyToUndefined)
  notes?: string;
}
