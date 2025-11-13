import { IsDateString, IsEmail, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DoctorDto {
  @IsString()
  @ApiProperty({
    description: 'ID của bác sĩ (UUID)',
    example: 'ce4ce76b-ae2d-496e-a9a3-0b458f2d61f9',
  })
  id!: string;

  @IsString()
  @ApiProperty({ description: 'Tên bác sĩ', example: 'Dr. Nguyen Van A' })
  name!: string;

  @IsOptional()
  @IsEmail()
  @ApiProperty({
    required: false,
    description: 'Email liên hệ của bác sĩ',
    example: 'nguyenvana@example.com',
  })
  email?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    required: false,
    description: 'Số điện thoại liên hệ (có thể kèm mã vùng)',
    example: '+84 912345678',
  })
  phone?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    required: false,
    description: 'Chuyên khoa / chuyên môn của bác sĩ',
    example: 'Cardiology',
  })
  specialty?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    required: false,
    description: 'Ghi chú thêm về bác sĩ',
    example: 'Bác sĩ chính phụ trách cao huyết áp',
  })
  notes?: string;

  @IsOptional()
  @IsDateString()
  @ApiProperty({
    required: false,
    description: 'Thời gian tạo bản ghi (ISO date)',
    example: '2025-10-20T12:03:04.000Z',
  })
  created_at?: string;

  @IsOptional()
  @IsDateString()
  @ApiProperty({
    required: false,
    description: 'Thời gian cập nhật bản ghi (ISO date)',
    example: '2025-10-30T17:03:04.000Z',
  })
  updated_at?: string;
}
