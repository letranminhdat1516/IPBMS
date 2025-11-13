import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Validator tùy chỉnh để đảm bảo payload gửi email hợp lệ.
 *
 * Quy tắc:
 * - Nếu client cung cấp `templateType` thì sẽ bỏ qua yêu cầu có `html` hoặc `text`
 *   vì nội dung sẽ được render từ template.
 * - Nếu client cung cấp `message` trực tiếp (hoặc `variables.message`),
 *   sẽ cho phép fallback sử dụng template `doctor_message` (được seed sẵn).
 * - Nếu không có `templateType` hoặc `message`, thì yêu cầu phải có `html` hoặc `text`.
 *
 * Mục đích: cho phép 3 luồng gửi email:
 * 1) Raw content: client gửi `subject` + `html`/`text`.
 * 2) Templated: client gửi `templateType` + `variables` -> server render template.
 * 3) Fallback message: client gửi `message` -> server dùng `doctor_message` template.
 */
@ValidatorConstraint({ async: false })
class HasHtmlOrText implements ValidatorConstraintInterface {
  validate(_: any, args: ValidationArguments) {
    const obj: any = args.object as any;
    // Nếu client cung cấp templateType thì chấp nhận (template sẽ cung cấp nội dung)
    if (obj && obj.templateType) return true;

    // Nếu client cung cấp field message trực tiếp thì cho phép fallback
    if (typeof obj.message === 'string' && obj.message.trim() !== '') return true;

    // Nếu variables.message được cung cấp, cũng cho phép fallback
    if (
      obj.variables &&
      typeof obj.variables.message === 'string' &&
      obj.variables.message.trim() !== ''
    )
      return true;

    // Cuối cùng, require có html hoặc text khi không có template/message
    return (
      (typeof obj.html === 'string' && obj.html.trim() !== '') ||
      (typeof obj.text === 'string' && obj.text.trim() !== '')
    );
  }

  defaultMessage(args: ValidationArguments) {
    // Thông báo lỗi mặc định (phiên bản tiếng Việt)
    return 'Vui lòng cung cấp nội dung HTML hoặc văn bản (text).';
  }
}

/**
 * DTO cho endpoint gửi email tới bác sĩ.
 *
 * Các trường:
 * - subject: (tuỳ chọn) tiêu đề email.
 * - html: (tuỳ chọn) nội dung HTML.
 * - text: (tuỳ chọn) nội dung plain-text.
 * - message: (tuỳ chọn) nội dung ngắn, dùng cho fallback template `doctor_message`.
 * - templateType: (tuỳ chọn) tên template đã lưu trong DB (ví dụ: 'appointment_confirmation').
 * - variables: (tuỳ chọn) object chứa biến để render template (ví dụ: { patientName, time }).
 *
 * Lưu ý sử dụng:
 * - Nếu sử dụng templateType, đảm bảo template đó tồn tại và active.
 * - Nếu muốn chỉ gửi một thông báo nhanh, có thể truyền `message` và server sẽ
 *   dùng template `doctor_message` để render nội dung.
 */
export class SendEmailDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    required: false,
    description: 'Tiêu đề email (nếu để trống sẽ dùng tiêu đề mặc định).',
    example: 'Xác nhận lịch hẹn khám',
  })
  subject?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    required: false,
    description:
      'Nội dung email dạng HTML. Nếu không dùng template, cần cung cấp `html` hoặc `text`.',
    example: '<p>Kính gửi bác sĩ, vui lòng xác nhận lịch hẹn vào 2025-11-11 09:00.</p>',
  })
  html?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    required: false,
    description: 'Nội dung email ở dạng plain-text (thay thế cho HTML nếu cần).',
    example: 'Xin chào bác sĩ, vui lòng xác nhận lịch hẹn vào 2025-11-11 09:00.',
  })
  text?: string;

  /**
   * Truyền message ngắn để server dùng `doctor_message` template làm fallback.
   * Ví dụ: { message: 'Patient needs urgent review.' }
   */
  @IsOptional()
  @IsString()
  @ApiProperty({
    required: false,
    description:
      "Nội dung ngắn (message). Nếu chỉ truyền trường này, server sẽ sử dụng template 'doctor_message' làm fallback.",
    example: 'Bệnh nhân cần được khám gấp trong ngày mai.',
  })
  message?: string;

  /**
   * Tên template đã lưu trong bảng mail_templates. Khi có templateType,
   * validator trên sẽ cho phép payload không có html/text.
   */
  @IsOptional()
  @IsString()
  @ApiProperty({
    required: false,
    description:
      'Loại template đã lưu (ví dụ: appointment_confirmation). Khi có templateType, server sẽ render nội dung từ template.',
    example: 'appointment_confirmation',
  })
  templateType?: string;

  /**
   * Biến để truyền vào template khi render. Ví dụ: { patientName: 'Nguyen A', time: '9:00' }
   */
  @IsOptional()
  @ApiProperty({
    required: false,
    description:
      'Các biến truyền vào template dưới dạng key-value. Ví dụ: { patientName: "Nguyen A", time: "09:00" }',
    example: { patientName: 'Nguyen A', time: '2025-11-11 09:00' },
  })
  variables?: Record<string, any>;

  // Validator thực thi các quy tắc ở trên.
  @Validate(HasHtmlOrText)
  _contentCheck?: any;
}
