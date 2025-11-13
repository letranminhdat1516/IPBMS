import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsUUID,
  IsOptional,
  IsDateString,
  IsObject,
  IsNumber,
  IsString,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { parseJsonOrUndefined } from '../../../shared/utils';

export class CreateDailySummaryDto {
  @ApiProperty({ example: 'uuid-user', description: 'User ID' })
  @IsUUID()
  @IsNotEmpty()
  user_id!: string;

  @ApiProperty({ example: '2024-06-01', description: 'Summary date' })
  @IsDateString()
  @IsOptional()
  @Type(() => Date)
  summary_date?: Date;

  @ApiProperty({ example: {}, description: 'Activity summary' })
  @Transform(parseJsonOrUndefined)
  @IsObject()
  @IsOptional()
  activity_summary?: object;

  @ApiProperty({ example: {}, description: 'Habit compliance' })
  @Transform(parseJsonOrUndefined)
  @IsObject()
  @IsOptional()
  habit_compliance?: object;

  @ApiProperty({ example: {}, description: 'Event summary' })
  @Transform(parseJsonOrUndefined)
  @IsObject()
  @IsOptional()
  event_summary?: object;

  @ApiProperty({ example: {}, description: 'Behavior patterns' })
  @Transform(parseJsonOrUndefined)
  @IsObject()
  @IsOptional()
  behavior_patterns?: object;

  @ApiProperty({ example: 1, description: 'Total snapshots' })
  @IsNumber()
  @IsOptional()
  total_snapshots?: number;

  @ApiProperty({ example: 1, description: 'Total events' })
  @IsNumber()
  @IsOptional()
  total_events?: number;

  @ApiProperty({ example: 1, description: 'Total alerts' })
  @IsNumber()
  @IsOptional()
  total_alerts?: number;

  @ApiProperty({ example: 0.5, description: 'Activity level' })
  @IsNumber()
  @IsOptional()
  activity_level_score?: number;

  @ApiProperty({ example: 0.5, description: 'Sleep quality' })
  @IsNumber()
  @IsOptional()
  sleep_quality_score?: number;

  @ApiProperty({ example: 'good', description: 'Overall status' })
  @IsString()
  @IsOptional()
  overall_status?: string;

  @ApiProperty({ example: 'Note', description: 'Notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}
