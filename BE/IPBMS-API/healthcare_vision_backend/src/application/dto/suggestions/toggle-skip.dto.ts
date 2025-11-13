import { IsIn, IsOptional, IsString, IsISO8601 } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ToggleSkipDto {
  @ApiProperty({
    enum: ['skip', 'unskip', 'snooze'],
    description: `Hành động thực hiện trên gợi ý. Chi tiết hành vi:
      - 'skip' — Đánh dấu gợi ý là bị bỏ qua: hệ thống sẽ không gửi nhắc cho gợi ý này cho đến khi skip hết hạn hoặc người dùng 'unskip'.
      - 'unskip' — Bỏ trạng thái bỏ qua: gợi ý sẽ trở lại trạng thái thông thường và được lập lịch nhắc theo cấu hình (sẽ đặt lại next_notify_at).
      - 'snooze' — Hoãn nhắc: tương tự 'skip' nhưng ngữ nghĩa là tạm hoãn trong một khoảng thời gian ngắn theo 'duration' (dùng khi muốn tạm hoãn nhắc trong một thời gian cụ thể).`,
    example: 'skip',
  })
  @IsString()
  @IsIn(['skip', 'unskip', 'snooze'])
  action!: 'skip' | 'unskip' | 'snooze';

  @ApiPropertyOptional({
    enum: ['15m', '1h', '8h', '24h', '2d', '7d', '30d', 'until_change', 'until_date'],
    description: `Khoảng thời gian rút gọn cho bỏ qua/hoãn. Giải thích cách hiểu:
      - '15m' — 15 phút
      - '1h' — 1 giờ
      - '8h' — 8 giờ
      - '24h' — 24 giờ (1 ngày)
      - '2d' — 2 ngày
      - '7d' — 7 ngày
      - '30d' — 30 ngày
      - 'until_change' — Bỏ qua cho đến khi người dùng chủ động thay đổi trạng thái (vô thời hạn)
  - 'until_date' — Bỏ qua cho đến ngày/tg cụ thể, phải cung cấp 'until_date' dưới định dạng ISO8601.

    Thực tế: server sẽ chuyển các mã này sang thời lượng nội bộ (ms) hoặc lưu trực tiếp 'until' = now + duration; chọn 'until_change' để lưu until = null/marker.`,
    example: '30d',
  })
  @IsOptional()
  @IsIn(['15m', '1h', '8h', '24h', '2d', '7d', '30d', 'until_change', 'until_date'])
  duration?: string;

  @ApiProperty({
    enum: ['item', 'type', 'all'],
    description: `Phạm vi hành động. Các giá trị:
      - 'item' — Áp dụng cho 1 gợi ý cụ thể (sử dụng endpoint '/api/suggestions/:id/toggle-skip'). Khi scope='item', parameter id bắt buộc.
  - 'type' — Áp dụng cho tất cả gợi ý cùng 'type' (phải cung cấp trường 'type'). Hệ thống sẽ tạo/ghi preference 'mute:type:<type>' hoặc cập nhật các gợi ý phù hợp.
      - 'all' — Áp dụng cho tất cả gợi ý của người dùng (tạo/ghi preference 'mute:all').`,
    example: 'item',
  })
  @IsString()
  @IsIn(['item', 'type', 'all'])
  scope!: 'item' | 'type' | 'all';

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    description: `Ngày ISO8601 (UTC) để kết thúc mute khi 'duration' là 'until_date'. Ví dụ: '2025-12-01T00:00:00Z'. Trường này bắt buộc khi duration = 'until_date'.`,
    example: '2025-12-01T00:00:00Z',
  })
  @IsOptional()
  @IsISO8601()
  until_date?: string;

  @ApiPropertyOptional({
    description: `Lý do (tùy chọn) cho hành động bỏ qua/hoãn, ví dụ: 'Tạm vắng' hoặc 'Đang nghỉ dưỡng'`,
    example: 'Tạm vắng',
  })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({
    description: `Loại gợi ý khi 'scope' là 'type'. Một số loại thông dụng (ví dụ, tuỳ hệ thống):
      - 'fallRisk' — Cảnh báo nguy cơ té ngã
      - 'medicationReminder' — Nhắc uống thuốc
      - 'hydrationReminder' — Nhắc uống nước
      - 'activityReminder' — Nhắc vận động/đi bộ
      - 'vitalsAbnormal' — Giá trị sinh tồn bất thường
      - 'medicationMissed' — Nhắc khi bỏ lỡ liều thuốc

  Lưu ý: danh sách này là ví dụ; hệ thống có thể có các 'type' khác. Khi scope='type', trường này bắt buộc.
    `,
    example: 'fallRisk',
    enum: [
      'fallRisk',
      'medicationReminder',
      'hydrationReminder',
      'activityReminder',
      'vitalsAbnormal',
      'medicationMissed',
    ],
  })
  @IsOptional()
  @IsString()
  type?: string;
}
