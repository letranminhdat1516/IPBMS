import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, IsObject, IsDateString } from 'class-validator';
import { ActivitySeverity, ActivityAction } from '../../../core/entities/activity_logs.entity';
import { Transform } from 'class-transformer';
import { parseJsonOrUndefined } from '../../../shared/utils';

export class UpdateActivityLogDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  timestamp?: Date;

  @ApiProperty()
  @IsUUID()
  actor_id?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  actor_name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  resource_type?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  resource_id?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  resource_name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiProperty({ enum: ActivitySeverity, default: ActivitySeverity.INFO })
  @IsOptional()
  @IsEnum(ActivitySeverity)
  severity?: ActivitySeverity;

  @ApiProperty({ enum: ActivityAction, required: false })
  @IsOptional()
  @IsEnum(ActivityAction)
  action_enum?: ActivityAction;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  @Transform(parseJsonOrUndefined)
  meta?: object;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  ip?: string;
}
