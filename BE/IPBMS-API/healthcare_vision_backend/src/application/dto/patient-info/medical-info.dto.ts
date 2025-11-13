import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  IsIn,
  IsNotEmpty,
  Matches,
} from 'class-validator';
import { HabitItemDto } from './patient-habits.dto';

export class PatientUpsertDto {
  @ApiPropertyOptional({ description: 'Họ tên bệnh nhân' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ description: 'Ngày sinh (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  dob?: string;
}

export class MedicalRecordUpsertDto {
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  name?: string;
  notes?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  history?: string[];
}

export class MedicalInfoUpsertDto {
  @ApiPropertyOptional({ type: PatientUpsertDto })
  @IsOptional()
  patient?: PatientUpsertDto;

  @ApiPropertyOptional({ type: MedicalRecordUpsertDto })
  @IsOptional()
  record?: MedicalRecordUpsertDto;

  @ApiPropertyOptional({ type: [HabitItemDto] })
  @IsOptional()
  @IsArray()
  habits?: HabitItemDto[];

  @ApiPropertyOptional({ description: 'ID của khách hàng (user_id)', type: String })
  @IsOptional()
  @IsString()
  customer_id?: string;
}

export class ContactCreateDto {
  @ApiProperty({ description: 'Tên liên hệ' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @ApiProperty({ description: 'Mối quan hệ' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(50)
  relation!: string;

  @ApiProperty({ description: 'Số điện thoại (định dạng Việt Nam: +84xxxxxxxxx hoặc 0xxxxxxxxx)' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^(\+84|84|0)[0-9]{8,9}$/, {
    message: 'Số điện thoại phải có định dạng +84xxxxxxxxx, 84xxxxxxxxx, hoặc 0xxxxxxxxx',
  })
  phone!: string;

  @ApiProperty({ enum: [1, 2], description: 'Cấp độ ưu tiên (1 = Ưu tiên cao, 2 = Ưu tiên thấp)' })
  @IsIn([1, 2])
  alert_level!: number;
}

export class ContactUpdateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(50)
  relation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Matches(/^(\+84|84|0)[0-9]{8,9}$/, {
    message: 'Số điện thoại phải có định dạng +84xxxxxxxxx, 84xxxxxxxxx, hoặc 0xxxxxxxxx',
  })
  phone?: string;

  @ApiPropertyOptional({ enum: [1, 2] })
  @IsOptional()
  @IsIn([1, 2])
  alert_level?: number;
}
