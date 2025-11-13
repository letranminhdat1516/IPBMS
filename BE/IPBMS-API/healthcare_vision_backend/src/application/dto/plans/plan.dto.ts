import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsIn,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import PlanBillingType from '../../../core/types/plan-billing.types';

export class CreatePlanDto {
  @ApiProperty({
    description: 'Tên của gói dịch vụ',
    example: 'Basic Plan',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    description: 'Mã code duy nhất của gói',
    example: 'basic',
  })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({
    description: 'Giá của gói dịch vụ',
    example: 99.99,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiProperty({
    description: 'Số camera tối đa',
    example: 5,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  camera_quota!: number;

  @ApiProperty({
    description: 'Số ngày lưu trữ',
    example: 30,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  retention_days!: number;

  @ApiProperty({
    description: 'Số caregiver tối đa',
    example: 2,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  caregiver_seats!: number;

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
    description: 'Số tháng cập nhật major',
    example: 24,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  major_updates_months?: number;

  @ApiPropertyOptional({
    description: 'Dung lượng lưu trữ',
    example: '100',
  })
  @IsOptional()
  @IsString()
  storage_size?: string;

  @ApiPropertyOptional({
    description: 'Phiên bản của plan',
    example: 'v1.0',
  })
  @IsOptional()
  @IsString()
  version?: string;

  @ApiPropertyOptional({
    description: 'Plan có đang active không',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  is_current?: boolean;

  @ApiPropertyOptional({
    description: 'Tier của plan',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  tier?: number;

  @ApiPropertyOptional({
    description: 'Đơn vị tiền tệ',
    example: 'VND',
  })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({
    description: 'Trạng thái plan',
    example: 'available',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: 'Plan có được khuyến nghị không',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  is_recommended?: boolean;

  @ApiPropertyOptional({
    description: 'Ngày bắt đầu hiệu lực',
    example: '2025-09-17T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  effective_from?: string;

  @ApiPropertyOptional({
    description: 'Ngày kết thúc hiệu lực',
    example: '2026-03-31T23:59:59.000Z',
  })
  @IsOptional()
  @IsDateString()
  effective_to?: string;
}

export class UpdatePlanDto {
  @ApiPropertyOptional({
    description: 'Tên của gói dịch vụ',
    example: 'Basic Plan Updated',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({
    description: 'Giá của gói dịch vụ',
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
    description: 'Số tháng cập nhật major',
    example: 12,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  major_updates_months?: number;

  @ApiPropertyOptional({
    description: 'Phiên bản của plan',
    example: 'v1.0',
  })
  @IsOptional()
  @IsString()
  version?: string;

  @ApiPropertyOptional({
    description: 'Plan có đang active không',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  is_current?: boolean;

  @ApiPropertyOptional({
    description: 'Ngày bắt đầu hiệu lực',
    example: '2025-09-15T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  effective_from?: string;

  @ApiPropertyOptional({
    description: 'Ngày kết thúc hiệu lực',
    example: '2025-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  effective_to?: string;

  @ApiPropertyOptional({
    description: 'Dung lượng lưu trữ',
    example: '100GB',
  })
  @IsOptional()
  @IsString()
  storage_size?: string;

  @ApiPropertyOptional({
    description: 'Plan có được khuyến nghị không',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  is_recommended?: boolean;

  @ApiPropertyOptional({
    description: 'Tier của plan',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  tier?: number;

  @ApiPropertyOptional({
    description: 'Loại tiền tệ',
    example: 'VND',
  })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({
    description: 'Trạng thái của plan',
    example: 'available',
    enum: ['available', 'unavailable', 'deprecated'],
  })
  @IsOptional()
  @IsString()
  status?: 'available' | 'unavailable' | 'deprecated';
}

export class UpgradePlanDto {
  @ApiProperty({
    description: 'Mã code của plan muốn nâng cấp (ví dụ: premium)',
    example: 'premium',
  })
  @IsString()
  @IsNotEmpty()
  plan_code!: string;

  @ApiPropertyOptional({
    description: 'Nhà cung cấp thanh toán (ví dụ vn_pay, stripe)',
    example: 'vn_pay',
  })
  @IsOptional()
  @IsString()
  payment_provider?: string;

  @ApiPropertyOptional({
    description: 'Chu kỳ mong muốn cho plan mới (monthly hoặc none)',
    enum: ['monthly', 'none'],
    example: 'monthly',
  })
  @IsOptional()
  @IsString()
  @IsIn(['monthly', 'none'])
  desired_billing_interval?: 'monthly' | 'none';

  @ApiPropertyOptional({
    description:
      'Snapshot của plan do client gửi (server sẽ ưu tiên nếu có). Dùng để đảm bảo giá/điều kiện chính xác tại thời điểm đổi.',
    example: { code: 'premium', unit_amount_minor: '150000', chosen_interval: 'monthly' },
  })
  @IsOptional()
  plan_snapshot?: Record<string, any>;

  @ApiPropertyOptional({
    description:
      'Giá đơn vị bằng minor units (string để an toàn qua JSON). Server sẽ ưu tiên snapshot.unit_amount_minor nếu có.',
    example: '150000',
  })
  @IsOptional()
  @IsString()
  unit_amount_minor?: string;

  @ApiPropertyOptional({
    description: 'Idempotency key để tránh duplicate charge khi client retry',
    example: 'cli-req-20251031-abc123',
  })
  @IsOptional()
  @IsString()
  idempotency_key?: string;

  @ApiPropertyOptional({
    description:
      "Hành động áp dụng: 'now' (áp dụng ngay), 'period_end' (áp dụng khi chu kỳ hiện tại kết thúc), hoặc 'timestamp' (áp dụng vào thời điểm cụ thể)",
    enum: ['now', 'period_end', 'timestamp'],
    example: 'now',
  })
  @IsOptional()
  @IsString()
  @IsIn(['now', 'period_end', 'timestamp'])
  effective_action?: 'now' | 'period_end' | 'timestamp';

  @ApiPropertyOptional({
    description: 'Nếu effective_action=timestamp, cung cấp thời điểm áp dụng (ISO string).',
    example: '2025-11-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  effective_date?: string;
}

export class ManualRenewRequestDto {
  @ApiPropertyOptional({
    description:
      'Chu kỳ thanh toán mong muốn. Mặc định dùng chu kỳ hiện tại của subscription/plan.',
    enum: ['monthly', 'none'],
    example: 'monthly',
  })
  @IsOptional()
  @IsString()
  @IsIn(['monthly', 'none'])
  billing_period?: 'monthly' | 'none';

  @ApiPropertyOptional({
    description: 'Hình thức thanh toán mong muốn',
    enum: PlanBillingType,
    example: PlanBillingType.PREPAID,
  })
  @IsOptional()
  @IsEnum(PlanBillingType)
  billing_type?: PlanBillingType;
}

export class UpdateQuotaDto {
  @ApiPropertyOptional({
    description: 'Số camera tối đa mới (ghi đè quota của plan nếu có)',
    example: 10,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  quota_camera_max?: number;

  @ApiPropertyOptional({
    description: 'Giá trị FPS tối đa mới cho camera',
    example: 15,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  quota_fps_max?: number;

  @ApiPropertyOptional({
    description: 'Số ngày lưu trữ tùy chỉnh (ghi đè retention_days của plan)',
    example: 30,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  quota_retention_days?: number;
}
