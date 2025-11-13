import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean, Length, Matches } from 'class-validator';
import { CreateCaregiverDto } from './create-caregiver.dto';

export class UpdateCaregiverDto extends PartialType(CreateCaregiverDto) {
  @ApiProperty({ required: false, example: '123456', description: 'Mã PIN mới (6 số)' })
  @IsOptional()
  @IsString()
  @Length(6, 6, { message: 'PIN phải đúng 6 ký tự' })
  @Matches(/^[0-9]{6}$/, { message: 'PIN chỉ được chứa 6 số' })
  pin?: string;

  @ApiProperty({ required: false, example: true, description: 'Trạng thái hoạt động' })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
