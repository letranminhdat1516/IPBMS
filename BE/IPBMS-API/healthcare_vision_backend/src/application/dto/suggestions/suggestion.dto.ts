import { ApiProperty } from '@nestjs/swagger';

export class SuggestionDto {
  @ApiProperty({
    description: 'ID nội bộ của gợi ý',
    example: 'sug-1',
  })
  id!: string;

  @ApiProperty({
    description: 'ID người dùng sở hữu gợi ý',
    example: 'user-1',
  })
  user_id!: string;

  @ApiProperty({
    description: 'Loại gợi ý (ví dụ: fallRisk, medicationReminder)',
    example: 'fallRisk',
  })
  type!: string;

  @ApiProperty({
    description: 'Tiêu đề ngắn cho gợi ý',
    example: 'Cảnh báo nguy cơ té ngã',
  })
  title!: string;

  @ApiProperty({
    description: 'Nội dung chi tiết của gợi ý',
    example: 'Người dùng có nguy cơ té ngã cao, xem xét kiểm tra',
  })
  message!: string;

  @ApiProperty({
    description: 'ISO8601 datetime khi gợi ý được bỏ qua tới (null nếu không bị bỏ qua)',
    example: '2025-12-01T00:00:00Z',
    nullable: true,
  })
  skip_until?: string | null;

  @ApiProperty({
    description: 'ISO8601 thời điểm dự kiến gửi nhắc lần tiếp theo (null nếu không có lịch)',
    nullable: true,
    example: null,
  })
  next_notify_at?: string | null;

  @ApiProperty({
    description: 'ISO8601 thời điểm đã gửi nhắc lần cuối (null nếu chưa gửi)',
    nullable: true,
    example: '2025-10-01T00:00:00Z',
  })
  last_notified_at?: string | null;

  @ApiProperty({
    description: 'Đối tượng metadata tuỳ biến chứa thông tin bổ sung (ví dụ: severity, source)',
  })
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'ISO8601 thời gian tạo bản ghi',
    example: '2025-10-01T00:00:00Z',
  })
  created_at!: string;

  @ApiProperty({
    description: 'ISO8601 thời gian cập nhật bản ghi gần nhất',
    example: '2025-10-01T00:00:00Z',
  })
  updated_at!: string;
}
