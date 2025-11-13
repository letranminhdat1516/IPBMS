import { IsOptional, IsString, IsInt, Min, Max, IsEnum, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum PlanStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DEPRECATED = 'deprecated',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class GetPlansQueryDto {
  @ApiPropertyOptional({
    description: 'Trang hiện tại',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Số lượng item mỗi trang',
    example: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Tìm kiếm theo tên hoặc mã plan',
    example: 'premium',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo trạng thái',
    enum: PlanStatus,
    example: PlanStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(PlanStatus)
  status?: PlanStatus;

  @ApiPropertyOptional({
    description: 'Sắp xếp theo trường',
    example: 'created_at',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'created_at';

  @ApiPropertyOptional({
    description: 'Thứ tự sắp xếp',
    enum: SortOrder,
    example: SortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;

  @ApiPropertyOptional({
    description: 'Ngày hiệu lực để lấy version active tại thời điểm đó',
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  effectiveDate?: string;

  @ApiPropertyOptional({
    description: 'Có trả về tất cả versions hay không (all hoặc current)',
    example: 'current',
    enum: ['current', 'all'],
  })
  @IsOptional()
  @IsEnum(['current', 'all'])
  withVersions?: 'current' | 'all' = 'current';
}
