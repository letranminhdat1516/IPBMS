import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsDateString, IsObject, IsNumber, IsString } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { parseJsonOrUndefined } from '../../../shared/utils';

export class UpdateDailySummaryDto {
  @ApiProperty({ example: 'uuid-user', description: 'User ID', required: false })
  @IsUUID()
  @IsOptional()
  user_id?: string;

  @ApiProperty({ example: '2024-06-01', description: 'Summary date', required: false })
  @IsDateString()
  @IsOptional()
  @Type(() => Date)
  summary_date?: Date;

  @ApiProperty({ example: {}, description: 'Activity summary', required: false })
  @IsObject()
  @IsOptional()
  @Transform(parseJsonOrUndefined)
  activity_summary?: object;

  @ApiProperty({ example: {}, description: 'Habit compliance', required: false })
  @IsObject()
  @IsOptional()
  @Transform(parseJsonOrUndefined)
  habit_compliance?: object;

  @ApiProperty({ example: {}, description: 'Event summary', required: false })
  @IsObject()
  @IsOptional()
  @Transform(parseJsonOrUndefined)
  event_summary?: object;

  @ApiProperty({ example: {}, description: 'Behavior patterns', required: false })
  @IsObject()
  @IsOptional()
  @Transform(parseJsonOrUndefined)
  behavior_patterns?: object;

  @ApiProperty({ example: 1, description: 'Total snapshots', required: false })
  @IsNumber()
  @IsOptional()
  total_snapshots?: number;

  @ApiProperty({ example: 1, description: 'Total events', required: false })
  @IsNumber()
  @IsOptional()
  total_events?: number;

  @ApiProperty({ example: 1, description: 'Total alerts', required: false })
  @IsNumber()
  @IsOptional()
  total_alerts?: number;

  @ApiProperty({ example: 0.5, description: 'Activity level', required: false })
  @IsNumber()
  @IsOptional()
  activity_level_score?: number;

  @ApiProperty({ example: 0.5, description: 'Sleep quality', required: false })
  @IsNumber()
  @IsOptional()
  sleep_quality_score?: number;

  @ApiProperty({ example: 'good', description: 'Overall status', required: false })
  @IsString()
  @IsOptional()
  overall_status?: string;

  @ApiProperty({ example: 'Note', description: 'Notes', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
