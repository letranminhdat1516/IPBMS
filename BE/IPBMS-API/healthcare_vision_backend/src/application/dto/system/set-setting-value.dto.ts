import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SetSettingValueDto {
  @IsDefined()
  @ApiProperty({
    description: 'Giá trị của setting (kiểu linh hoạt - object/primitive)',
    example: { enable: true, count: 30 },
  })
  value?: any;

  @IsOptional()
  @IsString()
  @ApiProperty({
    required: false,
    description: 'Ghi chú (tuỳ chọn)',
    example: 'Apply to region=vn',
  })
  note?: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'admin-uuid', description: 'ID của người cập nhật' })
  updated_by!: string;
}
