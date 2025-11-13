import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { TicketCategory, TicketPriority, TicketType } from '../../../shared/types/ticket-enums';
import { AttachmentDto } from './attachment.dto';
import { ResolvedAttachmentDto } from './resolved-attachment.dto';

export class CreateTicketDto {
  @ApiProperty({
    example: 'uuid-user',
    description:
      'UUID của user chủ sở hữu ticket. Nếu caller không phải admin, server sẽ ghi đè trường này bằng user id từ token. Frontend có thể bỏ qua trường này để server tự xác định owner.',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  user_id?: string;

  @ApiProperty({
    example: 'technical',
    description:
      "Phân loại ticket (ví dụ: 'technical', 'billing', 'general'). Dùng để chuyển tới đội xử lý phù hợp. FE nên lấy danh sách hợp lệ từ API metadata (TicketsSwagger.meta).",
    enum: TicketCategory,
  })
  @IsEnum(TicketCategory)
  @IsOptional()
  category?: TicketCategory;

  @ApiProperty({
    example: 'Need help',
    description: 'Tiêu đề ngắn (tóm tắt vấn đề), tối đa ~120 ký tự.',
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({
    example: 'support',
    description: 'Loại yêu cầu (report|support). Nếu không cung cấp, backend sẽ mặc định support.',
    enum: TicketType,
    required: false,
  })
  @IsEnum(TicketType)
  @IsOptional()
  type?: TicketType;

  @ApiProperty({
    example: 'Description of request',
    description:
      '(Bắt buộc) Mô tả chi tiết vấn đề, kèm bước tái hiện, log hoặc link ảnh. Hỗ trợ plain text hoặc markdown nhẹ. Cố gắng cung cấp thông tin đủ để agent có thể bắt đầu xử lý.',
  })
  @IsString()
  @IsNotEmpty()
  description!: string;

  // priority and tags removed from create DTO: ticket creation endpoint no longer accepts these fields

  // due_date removed: tickets no longer accept due_date from clients
  @ApiProperty({
    type: [AttachmentDto],
    description:
      '(Tuỳ chọn) Mảng metadata file đã upload (file_id, file_url, file_name, mime_type, file_size...). Frontend nên upload file trước qua endpoint /credential_images và sau đó truyền các tham chiếu ở đây. Backend (AttachmentResolveInterceptor) sẽ verify và ánh xạ file_id -> canonical url, rồi lưu canonical objects vào metadata.attachments.',
    required: false,
  })
  @IsOptional()
  attachments?: AttachmentDto[];

  @ApiProperty({
    type: [ResolvedAttachmentDto],
    description:
      '(Tuỳ chọn) Sau khi server resolve, metadata.attachments sẽ chứa mảng ResolvedAttachmentDto (canonical fields).',
    required: false,
  })
  metadata?: { attachments?: ResolvedAttachmentDto[] };
}
