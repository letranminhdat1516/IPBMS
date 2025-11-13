import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsISO8601, IsOptional, IsString, Max, Min } from 'class-validator';

export class SleepCheckinHistoryQueryDto {
  @ApiPropertyOptional({
    description: 'Từ ngày (ISO 8601), ví dụ 2025-11-01 hoặc 2025-11-01T00:00:00Z',
    example: '2025-11-01',
  })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({
    description: 'Đến ngày (ISO 8601), inclusive',
    example: '2025-11-07',
  })
  @IsOptional()
  @IsISO8601()
  to?: string;

  @ApiPropertyOptional({ description: 'Trang (1-based)', example: 1 })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    const str = String(value);
    if (/^-?\d+$/.test(str)) return parseInt(str, 10);
    return Number(value);
  })
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Số bản ghi trên trang', example: 20 })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    const str = String(value);
    if (/^-?\d+$/.test(str)) return parseInt(str, 10);
    return Number(value);
  })
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Sắp xếp theo trường', example: 'date' })
  @IsOptional()
  @IsString()
  sortBy?: 'date' | 'created_at' | 'updated_at' | 'state';

  @ApiPropertyOptional({ description: 'Thứ tự sắp xếp', example: 'desc' })
  @IsOptional()
  @IsEnum(['asc', 'desc'] as any)
  order?: 'asc' | 'desc';

  @ApiPropertyOptional({ description: 'Lọc theo trạng thái (sleep|awake)', example: 'sleep' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo nguồn trong meta (ví dụ: app, device)',
    example: 'app',
  })
  @IsOptional()
  @IsString()
  source?: string;
}
