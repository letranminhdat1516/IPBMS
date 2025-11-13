import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';
import { EventStatusEnum, EventTypeEnum } from '../../../core/entities/events.entity';

export class ProposeEventDto {
  @ApiProperty({
    description:
      "Required. Kiểu: string. Giá trị hợp lệ (chính xác, chữ thường): 'danger' | 'warning' | 'normal'. FE: hiển thị label tiếng Việt tương ứng (danger → 'Nguy hiểm', warning → 'Cần chú ý', normal → 'Bình thường') và validate trước khi gửi. Lưu ý: gửi chính xác chữ thường, không kèm khoảng trắng. Khi proposal được chấp thuận (bằng customer hoặc auto-approve) trường 'status' của event sẽ được cập nhật thành giá trị này.",
    enum: Object.values(EventStatusEnum),
    example: 'warning',
  })
  @IsString()
  @IsIn(Object.values(EventStatusEnum) as string[])
  proposed_status!: string;

  @ApiPropertyOptional({
    description:
      "Optional. Kiểu: string. Loại sự kiện đề xuất thay đổi. Giá trị hợp lệ: 'fall_detection' | 'abnormal_behavior' | 'normal_activity' | 'emergency' | 'inactivity' | 'intrusion'. Nếu caregiver muốn thay đổi cả loại event (ví dụ từ 'fall_detection' → 'normal_activity' vì người dùng đang tập thể dục), truyền field này. Nếu null/undefined, chỉ thay đổi status.",
    enum: Object.values(EventTypeEnum),
    example: 'normal_activity',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(Object.values(EventTypeEnum) as string[])
  proposed_event_type?: string;

  @ApiProperty({
    description:
      "Optional. Kiểu: ISO 8601 datetime string (UTC), ví dụ '2025-10-10T12:00:00Z'. Nếu không truyền hoặc truyền null, server mặc định TTL = 48 giờ (2 ngày) từ thời điểm nhận request. Nếu gửi thời điểm trong quá khứ, backend có thể coi là đã hết hạn ngay lập tức (có thể dẫn tới auto-approve hoặc xử lý tức thì). FE nên gửi UTC ISO (YYYY-MM-DDTHH:mm:ssZ) và hiển thị countdown cho người dùng.",
    format: 'date-time',
    required: false,
    example: '2025-10-10T12:00:00Z',
  })
  @IsOptional()
  @IsISO8601()
  pending_until?: string;

  @ApiProperty({
    description:
      'Optional. Kiểu: string. Lý do đề xuất thay đổi. Ghi chú ngắn giải thích lý do; sẽ hiển thị cho customer và trong notification. KHÔNG gửi dữ liệu nhạy cảm. FE nên giới hạn 240 ký tự (server có thể trim hoặc cắt ngắn). Nên loại bỏ/escape HTML và ký tự điều khiển trước khi gửi để tránh XSS; server cũng có thể sanitize đầu vào.',
    required: false,
    maxLength: 240,
    example: 'Người dùng đang tập thể dục, không phải ngã',
  })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  reason?: string;
}
