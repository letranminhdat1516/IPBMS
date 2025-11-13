import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * DTO for updating event confirm_status
 * Used in PATCH /event-detections/:event_id/confirm-status endpoint
 */
export class UpdateConfirmStatusDto {
  @ApiProperty({
    description: `Trạng thái xác nhận sự kiện:
    
**true (Xác nhận):**
- Đánh dấu sự kiện là chính xác/hợp lệ
- Tự động set acknowledged_at = thời điểm hiện tại
- Tự động set acknowledged_by = user_id của người thực hiện
- Sự kiện được coi là đã được xác minh

**false (Từ chối):**
- Đánh dấu sự kiện không chính xác/sai
- KHÔNG cập nhật acknowledged_at hoặc acknowledged_by
- Nên kèm theo notes giải thích lý do từ chối

**Business Rules:**
- Customer: Có thể confirm/reject events từ cameras của họ
- Caregiver: Có thể confirm/reject events của customers được assigned
- Admin: Có thể confirm/reject bất kỳ events nào

**Note:** Sau khi confirm_status được set, có thể được cập nhật lại nếu cần.`,
    example: true,
    type: Boolean,
    required: true,
  })
  @IsBoolean({ message: 'confirm_status phải là giá trị boolean (true hoặc false)' })
  confirm_status!: boolean;

  @ApiProperty({
    description: `Ghi chú chi tiết về việc xác nhận hoặc từ chối sự kiện (tùy chọn nhưng khuyến nghị).

**Nếu không gửi trường này, hệ thống sẽ xóa ghi chú cũ và chỉ lưu lại confirm_status.**

**Recommended Usage:**
- **Khi confirm_status = true:** Ghi nhận lý do xác nhận, hành động đã thực hiện
  - VD: "Đã xác minh tại chỗ, người dùng an toàn"
  - VD: "Fall event chính xác, đã hỗ trợ người dùng"
  
- **Khi confirm_status = false:** BẮT BUỘC nên có notes giải thích
  - VD: "Không phải sự kiện ngã, chỉ là người dùng đang ngồi xuống"
  - VD: "False positive từ AI, không có sự cố thực tế"
  - VD: "Camera bị che khuất, không thể xác định chính xác"

**Validation:**
- Tối đa 1000 ký tự
- Hỗ trợ Unicode (tiếng Việt, emoji, ký tự đặc biệt)
- Có thể bỏ trống nhưng không khuyến nghị

**Use Cases:**
- Audit trail: Giúp theo dõi lý do quyết định
- Training data: Cải thiện AI model
- Customer service: Giải thích cho người dùng
- Legal compliance: Lưu vết quyết định`,
    example: 'Sự kiện ngã chính xác, đã hỗ trợ người dùng đứng dậy. Không có thương tích.',
    type: String,
    required: false,
    maxLength: 1000,
  })
  @IsOptional()
  @IsString({ message: 'notes phải là chuỗi văn bản' })
  @MaxLength(1000, { message: 'notes không được vượt quá 1000 ký tự' })
  notes?: string;
}
