import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import PlanBillingType from '../../../core/types/plan-billing.types';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: Date;
  error?: string;
}

export class PlanVersionResponseDto {
  @ApiProperty({
    description: 'ID của phiên bản',
    example: 'uuid-string',
  })
  id!: string;

  @ApiProperty({
    description: 'Mã code của plan',
    example: 'basic',
  })
  plan_code!: string;

  @ApiProperty({
    description: 'Phiên bản',
    example: '2025.1',
  })
  version!: string;

  @ApiProperty({
    description: 'Giá của phiên bản',
    example: 99.99,
  })
  price!: number;

  @ApiProperty({
    description: 'Số camera tối đa',
    example: 5,
  })
  camera_quota!: number;

  @ApiProperty({
    description: 'Số ngày lưu trữ',
    example: 30,
  })
  retention_days!: number;

  @ApiProperty({
    description: 'Số caregiver tối đa',
    example: 2,
  })
  caregiver_seats!: number;

  @ApiProperty({
    description: 'Số sites tối đa',
    example: 1,
  })
  sites!: number;

  @ApiProperty({
    description: 'Dung lượng lưu trữ',
    example: 100,
    required: false,
  })
  storage_size?: number;

  @ApiProperty({
    description: 'Ngày bắt đầu hiệu lực',
    example: '2025-01-01',
  })
  effective_from!: string;

  @ApiProperty({
    description: 'Ngày kết thúc hiệu lực',
    example: '2025-12-31',
    required: false,
  })
  effective_to?: string;

  @ApiProperty({
    description: 'Có phải phiên bản hiện tại không',
    example: true,
  })
  is_current!: boolean;

  @ApiProperty({
    description: 'Ngày tạo',
    example: '2025-01-01T00:00:00.000Z',
  })
  created_at!: Date;
}

export class PlanResponseDto {
  @ApiProperty({
    description: 'Mã code của plan',
    example: 'basic',
  })
  code!: string;

  @ApiProperty({
    description: 'Tên của plan',
    example: 'Basic Plan',
  })
  name!: string;

  @ApiProperty({
    description: 'Giá của plan',
    example: 99.99,
  })
  price!: number;

  // price: numeric monthly price (major units). Use `unit_amount_minor` in snapshots for minor units when needed.
  @ApiPropertyOptional({
    description: 'Đơn vị tiền tệ',
    example: 'VND',
  })
  currency?: string;

  @ApiProperty({
    description: 'Số camera tối đa',
    example: 5,
  })
  camera_quota!: number;

  @ApiProperty({
    description: 'Số ngày lưu trữ',
    example: 30,
  })
  retention_days!: number;

  @ApiProperty({
    description: 'Số caregiver tối đa',
    example: 2,
  })
  caregiver_seats!: number;

  @ApiProperty({
    description: 'Số sites tối đa',
    example: 1,
  })
  sites!: number;

  @ApiProperty({
    description: 'Số tháng cập nhật major',
    example: 24,
  })
  major_updates_months!: number;

  @ApiProperty({
    description: 'Ngày tạo',
    example: '2025-01-01T00:00:00.000Z',
  })
  created_at!: Date;

  @ApiProperty({
    description: 'Phiên bản hiện tại (nếu có)',
    required: false,
  })
  current_version?: PlanVersionResponseDto;
}

export class PlanStatisticsDto {
  @ApiProperty({
    description: 'Năm thống kê',
    example: 2025,
  })
  year!: number;

  @ApiProperty({
    description: 'Mã code của plan',
    example: 'basic',
  })
  plan_code!: string;

  @ApiProperty({
    description: 'Tên plan',
    example: 'Basic Plan',
  })
  plan_name!: string;

  @ApiProperty({
    description: 'Số lượng người dùng',
    example: 150,
  })
  user_count!: number;

  @ApiProperty({
    description: 'Giá trung bình',
    example: 99.99,
  })
  avg_price!: number;
}

export class PlanComparisonDto {
  @ApiProperty({
    description: 'Mã code của plan',
    example: 'basic',
  })
  code!: string;

  @ApiProperty({
    description: 'Tên plan',
    example: 'Basic Plan',
  })
  name!: string;

  @ApiProperty({
    description: 'Giá plan',
    example: 99.99,
  })
  price!: number;

  @ApiProperty({
    description: 'Số người dùng hiện tại',
    example: 150,
  })
  current_users!: number;

  @ApiProperty({
    description: 'Số ngày subscription trung bình',
    example: 365,
  })
  avg_subscription_days!: number;
}

export class QuotaDto {
  @ApiProperty({ description: 'Số camera tối đa (từ subscription/plan)', example: 6 })
  quota_camera_max!: number;

  @ApiProperty({ description: 'Giá trị FPS tối đa cho camera', example: 15 })
  quota_fps_max!: number;

  @ApiProperty({ description: 'Số ngày lưu trữ (ghi đè nếu có)', example: 30 })
  quota_retention_days!: number;
}

export class SubscriptionDto {
  @ApiProperty({ description: 'Subscription ID', example: 'sub_123' })
  subscription_id!: string;

  @ApiProperty({ description: 'Trạng thái subscription', example: 'active' })
  status!: string;

  @ApiProperty({ description: 'Bắt đầu kỳ hiện tại', example: '2025-09-04T00:00:00.000Z' })
  current_period_start!: string;

  @ApiProperty({ description: 'Kết thúc kỳ hiện tại', example: '2025-10-04T00:00:00.000Z' })
  current_period_end!: string;

  @ApiPropertyOptional({ description: 'Tự động gia hạn hay không', example: true })
  auto_renew?: boolean;

  @ApiPropertyOptional({
    description: 'Thời điểm thanh toán cuối cùng',
    example: '2025-09-04T01:00:00.000Z',
  })
  last_payment_at?: string;
}

export class ApiResponsePlanDto {
  @ApiProperty({ description: 'Thao tác thành công hay không', example: true })
  success!: boolean;

  @ApiProperty({ description: 'Dữ liệu plan', type: PlanResponseDto })
  data!: PlanResponseDto;

  @ApiPropertyOptional({
    description: 'Thông điệp mô tả',
    example: 'Lấy thông tin plan thành công',
  })
  message?: string;

  @ApiProperty({ description: 'Timestamp trả về', example: '2025-10-20T12:10:00.000Z' })
  timestamp!: string;
}

export class ApiResponsePlanArrayDto {
  @ApiProperty({ description: 'Thao tác thành công hay không', example: true })
  success!: boolean;

  @ApiProperty({ description: 'Danh sách plans', type: PlanResponseDto, isArray: true })
  data!: PlanResponseDto[];

  @ApiPropertyOptional({
    description: 'Thông điệp mô tả',
    example: 'Lấy danh sách plans thành công',
  })
  message?: string;

  @ApiProperty({ description: 'Timestamp trả về', example: '2025-10-20T12:00:00.000Z' })
  timestamp!: string;
}

export class ApiResponseCurrentPlanDto {
  @ApiProperty({ description: 'Thao tác thành công hay không', example: true })
  success!: boolean;

  @ApiProperty({ description: 'Dữ liệu plan hiện tại (kết hợp plan + subscription)' })
  data!: PlanResponseDto & { quota?: QuotaDto; subscription?: SubscriptionDto };

  @ApiPropertyOptional({
    description: 'Thông điệp mô tả',
    example: 'Lấy thông tin gói dịch vụ hiện tại thành công',
  })
  message?: string;

  @ApiProperty({ description: 'Timestamp trả về', example: '2025-10-20T12:10:00.000Z' })
  timestamp!: string;
}

export class UpgradeResultDto {
  @ApiProperty({ description: 'Trạng thái giao dịch', example: 'requires_action' })
  status!: string;

  @ApiPropertyOptional({ description: 'Charge tạm tính (VND)', example: '50000' })
  prorationCharge?: string;

  @ApiPropertyOptional({ description: 'Credit tạm tính (VND)', example: '0' })
  prorationCredit?: string;

  @ApiPropertyOptional({ description: 'Số tiền phải thanh toán', example: '50000' })
  amountDue?: string;

  @ApiPropertyOptional({ description: 'Mã giao dịch', example: 'tx_123' })
  transactionId?: string;

  @ApiPropertyOptional({ description: 'Bắt đầu kỳ mới', example: '2025-09-04T00:00:00.000Z' })
  periodStart?: string;

  @ApiPropertyOptional({ description: 'Kết thúc kỳ mới', example: '2025-10-04T00:00:00.000Z' })
  periodEnd?: string;

  @ApiPropertyOptional({
    description: 'Thông điệp mô tả',
    example: 'Chỉ cần thanh toán thêm 50000 VND',
  })
  message?: string;
}

export class ApiResponseUpgradeDto {
  @ApiProperty({ description: 'Thao tác thành công hay không', example: true })
  success!: boolean;

  @ApiProperty({ description: 'Kết quả nâng cấp', type: UpgradeResultDto })
  data!: UpgradeResultDto;

  @ApiPropertyOptional({ description: 'Thông điệp mô tả', example: 'Chuẩn bị nâng cấp thành công' })
  message?: string;

  @ApiProperty({ description: 'Timestamp trả về', example: '2025-10-20T12:15:00.000Z' })
  timestamp!: string;
}

export class ApiResponseUpdateQuotaDto {
  @ApiProperty({ description: 'Thao tác thành công hay không', example: true })
  success!: boolean;

  @ApiProperty({
    description: 'Dữ liệu trả về (updated flag + message)',
    example: { updated: true, message: 'Tính năng cập nhật quota đã bị vô hiệu hóa' },
  })
  data!: Record<string, any>;

  @ApiPropertyOptional({ description: 'Thông điệp mô tả', example: 'Cập nhật quota thành công' })
  message?: string;

  @ApiProperty({ description: 'Timestamp trả về', example: '2025-10-20T12:20:00.000Z' })
  timestamp!: string;
}

export class RenewPlanResultDto {
  @ApiProperty({ description: 'ID payment được tạo', example: 'a1b2c3d4-uuid' })
  paymentId!: string;

  @ApiProperty({ description: 'URL thanh toán VNPay', example: 'https://sandbox.vnpay.vn/payment' })
  paymentUrl!: string;

  @ApiProperty({ description: 'Mã gói đang gia hạn', example: 'premium' })
  plan_code!: string;

  @ApiPropertyOptional({ description: 'Tên gói đang gia hạn', example: 'Premium Clinic' })
  plan_name?: string | null;

  @ApiProperty({
    description: 'Số tiền phải thanh toán (VND, định dạng số nguyên)',
    example: 990000,
  })
  amount!: number;

  @ApiPropertyOptional({
    description: 'ID subscription liên quan',
    example: 'sub_123456',
  })
  subscription_id?: string;

  @ApiPropertyOptional({
    description: 'Chu kỳ thanh toán được áp dụng',
    example: 'monthly',
  })
  billing_period?: string;

  @ApiPropertyOptional({
    description: 'Hình thức thanh toán (trả trước/trả sau)',
    enum: PlanBillingType,
    example: PlanBillingType.PREPAID,
  })
  billing_type?: PlanBillingType;
}

export class ApiResponseRenewPlanDto {
  @ApiProperty({ description: 'Thao tác thành công hay không', example: true })
  success!: boolean;

  @ApiProperty({ description: 'Thông tin payment gia hạn', type: RenewPlanResultDto })
  data!: RenewPlanResultDto;

  @ApiPropertyOptional({
    description: 'Thông điệp mô tả',
    example: 'Đã tạo liên kết thanh toán gia hạn',
  })
  message?: string;

  @ApiProperty({ description: 'Timestamp trả về', example: '2025-10-20T12:30:00.000Z' })
  timestamp!: string;
}
