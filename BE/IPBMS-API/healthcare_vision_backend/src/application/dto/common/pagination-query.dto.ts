import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Transform(({ value }) => {
    // Query params come as strings. Treat empty string as "not provided" so default applies.
    if (value === undefined || value === null || value === '') return undefined;
    // If the value is a pure integer string, parse as integer. Otherwise return Number(value)
    const str = String(value);
    if (/^-?\d+$/.test(str)) return parseInt(str, 10);
    return Number(value);
  })
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
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
  limit?: number = 20;
}
