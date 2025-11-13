import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString, IsEnum } from 'class-validator';
import { ActivitySeverity } from '../../../core/entities/activity_logs.entity';

export class ExportActivityLogsDto {
  @ApiPropertyOptional({
    description: 'Start date for export (YYYY-MM-DD)',
    example: '2025-09-01',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    description: 'End date for export (YYYY-MM-DD)',
    example: '2025-09-07',
  })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({
    description: 'Filter by user ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Filter by severity',
    enum: ActivitySeverity,
    example: ActivitySeverity.INFO,
  })
  @IsOptional()
  @IsEnum(ActivitySeverity)
  severity?: ActivitySeverity;

  @ApiPropertyOptional({
    description: 'Filter by action',
    example: 'login',
  })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({
    description: 'Export format',
    enum: ['csv', 'json'],
    example: 'csv',
  })
  @IsOptional()
  @IsString()
  format?: 'csv' | 'json' = 'csv';
}
