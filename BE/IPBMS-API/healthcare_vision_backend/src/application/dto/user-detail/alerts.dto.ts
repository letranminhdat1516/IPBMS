import { ApiProperty, ApiPropertyOptional, IntersectionType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { PaginationQueryDto } from '../common/pagination-query.dto';
import { SortQueryDto } from '../common/sort-query.dto';
import { DateRangeQueryDto } from '../common/date-range-query.dto';

export class AlertItemDto {
  @ApiProperty() event_id!: string;
  @ApiProperty() user_id!: string;
  @ApiProperty() camera_id!: string;
  @ApiProperty() event_type!: string;
  @ApiProperty() status!: string;
  @ApiProperty() detected_at!: Date;
  @ApiProperty() confidence_score!: number;
  @ApiPropertyOptional({ type: Object }) context_data?: any;
  @ApiPropertyOptional({ nullable: true }) snapshot_id?: string | null;
  @ApiProperty({ enum: ['low', 'medium', 'high', 'critical'] }) severity!:
    | 'low'
    | 'medium'
    | 'high'
    | 'critical';
}

export class AlertsPaginationDto {
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() total!: number;
}

export class AlertsSummaryDto {
  @ApiProperty({ type: Object }) bySeverity!: Record<
    'low' | 'medium' | 'high' | 'critical',
    number
  >;
  @ApiProperty({ type: Object }) byStatus!: Record<string, number>;
}

export class AlertsResponseDto {
  @ApiProperty({ type: AlertItemDto, isArray: true }) items!: AlertItemDto[];
  @ApiProperty({ type: AlertsPaginationDto }) pagination!: AlertsPaginationDto;
  @ApiPropertyOptional({ type: AlertsSummaryDto }) summary?: AlertsSummaryDto;
}

export class AlertsQueryBase extends IntersectionType(
  PaginationQueryDto,
  IntersectionType(SortQueryDto<'detected_at' | 'confidence_score'>, DateRangeQueryDto),
) {}

export class AlertsQueryDto extends AlertsQueryBase {
  @ApiPropertyOptional({
    type: [String],
    description: 'low|medium|high|critical',
  })
  @Transform(({ value }) =>
    Array.isArray(value)
      ? value
      : typeof value === 'string'
        ? value
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean)
        : undefined,
  )
  severity?: string[];

  @ApiPropertyOptional({ type: [String] })
  @Transform(({ value }) =>
    Array.isArray(value)
      ? value
      : typeof value === 'string'
        ? value
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean)
        : undefined,
  )
  status?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'fall|convulsion|stagger|visitor|unknown',
  })
  @Transform(({ value }) =>
    Array.isArray(value)
      ? value
      : typeof value === 'string'
        ? value
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean)
        : undefined,
  )
  type?: string[];

  @ApiPropertyOptional({ default: true })
  @Transform(({ value }) => (typeof value === 'string' ? value !== 'false' : Boolean(value)))
  includeSummary?: boolean;
}
