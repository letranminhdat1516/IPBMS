import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsDateString } from 'class-validator';

export class HealthQueryDto {
  @ApiPropertyOptional({ example: '2025-08-18' })
  @IsOptional()
  @IsDateString()
  startDay?: string;

  @ApiPropertyOptional({ example: '2025-08-21' })
  @IsOptional()
  @IsDateString()
  endDay?: string;
}
