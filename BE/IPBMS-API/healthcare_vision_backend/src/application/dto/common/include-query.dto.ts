import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional } from 'class-validator';

export class IncludeQueryDto {
  @ApiPropertyOptional({
    description: 'Danh sách include, phân tách bằng dấu phẩy',
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
}
