import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsOptional,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePlanVersionDto {
  @ApiProperty({
    description: 'Mã code của plan',
    example: 'basic',
  })
  @IsString()
  @IsNotEmpty()
  plan_code!: string;

  @ApiProperty({
    description: 'Phiên bản theo định dạng CalVer (YYYY.MM hoặc YYYY.MM.n)',
    example: '2025.1',
  })
  @IsString()
  @IsNotEmpty()
  version!: string;

  @ApiPropertyOptional({
    description: 'Giá của phiên bản này',
    example: 99.99,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({
    description: 'Số camera tối đa',
    example: 5,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  camera_quota?: number;

  @ApiPropertyOptional({
    description: 'Số ngày lưu trữ',
    example: 30,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  retention_days?: number;

  @ApiPropertyOptional({
    description: 'Số caregiver tối đa',
    example: 2,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  caregiver_seats?: number;

  @ApiPropertyOptional({
    description: 'Số sites tối đa',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  sites?: number;

  @ApiPropertyOptional({
    description: 'Dung lượng lưu trữ (GB)',
    example: 100,
  })
  @IsOptional()
  @IsNumber()
  storage_size?: number;

  @ApiProperty({
    description: 'Ngày bắt đầu hiệu lực',
    example: '2025-01-01',
  })
  @IsDateString()
  effective_from!: string;

  @ApiPropertyOptional({
    description: 'Ngày kết thúc hiệu lực (optional)',
    example: '2025-12-31',
  })
  @IsOptional()
  @IsDateString()
  effective_to?: string;

  @ApiPropertyOptional({
    description: 'Có phải phiên bản hiện tại không',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  is_current?: boolean;
}

export class UpdatePlanVersionDto {
  @ApiPropertyOptional({
    description: 'Phiên bản theo định dạng CalVer',
    example: '2025.2',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  version?: string;

  @ApiPropertyOptional({
    description: 'Giá của phiên bản này',
    example: 129.99,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({
    description: 'Số camera tối đa',
    example: 10,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  camera_quota?: number;

  @ApiPropertyOptional({
    description: 'Số ngày lưu trữ',
    example: 60,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  retention_days?: number;

  @ApiPropertyOptional({
    description: 'Số caregiver tối đa',
    example: 5,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  caregiver_seats?: number;

  @ApiPropertyOptional({
    description: 'Số sites tối đa',
    example: 2,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  sites?: number;

  @ApiPropertyOptional({
    description: 'Dung lượng lưu trữ (GB)',
    example: 200,
  })
  @IsOptional()
  @IsNumber()
  storage_size?: number;

  @ApiPropertyOptional({
    description: 'Ngày bắt đầu hiệu lực',
    example: '2025-02-01',
  })
  @IsOptional()
  @IsDateString()
  effective_from?: string;

  @ApiPropertyOptional({
    description: 'Ngày kết thúc hiệu lực',
    example: '2025-12-31',
  })
  @IsOptional()
  @IsDateString()
  effective_to?: string;

  @ApiPropertyOptional({
    description: 'Có phải phiên bản hiện tại không',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  is_current?: boolean;
}
