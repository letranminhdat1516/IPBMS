import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose, Transform } from 'class-transformer';

@Exclude()
export class UserDto {
  @ApiProperty({ description: 'ID người dùng (UUID)' })
  @Expose()
  user_id!: string;

  @ApiProperty({ description: 'Họ và tên đầy đủ' })
  @Expose()
  full_name!: string;

  @ApiProperty({ description: 'Địa chỉ email' })
  @Expose()
  email!: string;

  @ApiProperty({ description: 'Vai trò (role) của người dùng trong hệ thống' })
  @Expose()
  role!: string;

  @ApiProperty({ description: 'Trạng thái hoạt động (true = đang hoạt động, false = bị khóa)' })
  @Expose()
  is_active!: boolean;

  @ApiProperty({ description: 'Ngày tham gia hệ thống (ISO datetime, từ created_at)' })
  @Expose({ name: 'created_at' })
  @Transform(
    ({ value }) => (value instanceof Date ? value.toISOString() : new Date(value).toISOString()),
    { toClassOnly: true },
  )
  joined!: string;

  @ApiPropertyOptional({ description: 'Tên đăng nhập (username)' })
  @Expose()
  username?: string;

  @ApiPropertyOptional({ description: 'Số điện thoại' })
  @Expose()
  phone_number?: string;

  @ApiPropertyOptional({ description: 'Địa chỉ' })
  @Expose()
  address?: string;

  @ApiPropertyOptional({ description: 'Tuổi' })
  @Expose()
  age?: number;

  @ApiPropertyOptional({ description: 'Bí danh (alias) của vai trò để hiển thị UI' })
  @Expose({ name: 'role' })
  @Transform(({ value }) => String(value), { toClassOnly: true })
  type?: string;

  @ApiPropertyOptional({ description: 'Mã bệnh nhân (nếu là bệnh nhân)' })
  @Expose()
  patient_id?: string;

  @ApiPropertyOptional({
    description: 'Trạng thái phân công của caregiver: assigned | available',
    enum: ['assigned', 'available'],
  })
  @Expose()
  assignment_status?: 'assigned' | 'available';

  // Thông tin gói dịch vụ, quota camera, cảnh báo và thanh toán
  @ApiPropertyOptional({ description: 'Tên gói dịch vụ' })
  @Expose()
  plan_name?: string;

  @ApiPropertyOptional({ description: 'Mã gói dịch vụ' })
  @Expose()
  plan_code?: string;

  @ApiPropertyOptional({ description: 'Số lượng camera tối đa (quota)' })
  @Expose()
  camera_quota?: number;

  @ApiPropertyOptional({ description: 'Số lượng camera đã sử dụng' })
  @Expose()
  camera_quota_used?: number;

  @ApiPropertyOptional({ description: 'Tổng số cảnh báo đã phát sinh' })
  @Expose()
  alerts_total?: number;

  @ApiPropertyOptional({ description: 'Số cảnh báo chưa được xử lý' })
  @Expose()
  alerts_unresolved?: number;

  @ApiPropertyOptional({ description: 'Tổng số giao dịch thanh toán' })
  @Expose()
  payments_total?: number;

  @ApiPropertyOptional({ description: 'Số giao dịch thanh toán đang chờ xử lý' })
  @Expose()
  payments_pending?: number;

  @ApiPropertyOptional({ description: 'Trạng thái đăng ký dịch vụ (subscription)' })
  @Expose()
  subscription_status?: string;

  @ApiPropertyOptional({ description: 'Thời gian hết hạn gói dịch vụ (ISO datetime)' })
  @Expose()
  subscription_expires_at?: string;
}
