import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, Matches } from 'class-validator';

export class MonitoringQueryDto {
  @ApiPropertyOptional({
    description: 'Comma list: settings,analytics,timeline',
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string'
      ? value
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean)
      : Array.isArray(value)
        ? value
        : undefined,
  )
  include?: string[];

  @ApiPropertyOptional({ description: 'YYYY-MM-DD' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date?: string;
}
