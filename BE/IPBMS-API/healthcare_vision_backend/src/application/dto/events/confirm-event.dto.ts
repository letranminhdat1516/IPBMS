import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ConfirmEventDto {
  @ApiProperty({
    description: "Required. 'approve' để chấp thuận, 'reject' để từ chối.",
    enum: ['approve', 'reject'],
    example: 'approve',
  })
  @IsString()
  @IsIn(['approve', 'reject'])
  action!: 'approve' | 'reject';

  @ApiProperty({
    description: 'Optional. Ghi chú kèm quyết định (tối đa 240 ký tự).',
    required: false,
    maxLength: 240,
    example: 'Xác nhận, cần chú ý khu vực này',
  })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  notes?: string;
}
