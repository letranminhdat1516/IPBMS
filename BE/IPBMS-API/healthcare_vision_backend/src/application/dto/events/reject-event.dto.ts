import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectEventDto {
  @ApiProperty({
    description: "Required. Sử dụng value 'reject' để biểu thị intent từ chối.",
    enum: ['reject'],
    example: 'reject',
  })
  @IsString()
  action!: 'reject';

  @ApiProperty({
    description: 'Optional. Lý do từ chối, hiển thị cho caregiver.',
    required: false,
    maxLength: 240,
    example: 'Không phải sự kiện, chỉ là thú nuôi',
  })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  rejection_reason?: string;
}
