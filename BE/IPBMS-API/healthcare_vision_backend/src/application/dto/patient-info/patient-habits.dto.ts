import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Frequency, HabitType } from '../../../core/entities/patient_habits.entity';

export class HabitItemDto {
  @ApiPropertyOptional({ description: 'ID của thói quen' })
  @IsOptional()
  @IsUUID()
  habit_id?: string;

  @ApiPropertyOptional({ enum: HabitType, description: 'Loại thói quen' })
  @IsOptional()
  @IsEnum(HabitType)
  habit_type?: HabitType;

  @ApiPropertyOptional({ description: 'Tên thói quen' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  habit_name?: string;

  @ApiPropertyOptional({ description: 'Mô tả' })
  @IsOptional()
  @IsString()
  description?: string | null;

  // `typical_time` removed in favor of explicit `sleep_start` / `sleep_end`.

  @ApiPropertyOptional({
    description: 'Giờ bắt đầu ngủ (dùng cho loại sleep) dạng HH:mm:ss',
    example: '23:00:00',
  })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/, {
    message: 'sleep_start must be HH:mm:ss',
  })
  sleep_start?: string | null;

  @ApiPropertyOptional({
    description: 'Giờ kết thúc ngủ (dùng cho loại sleep) dạng HH:mm:ss',
    example: '07:00:00',
  })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/, {
    message: 'sleep_end must be HH:mm:ss',
  })
  sleep_end?: string | null;

  @ApiPropertyOptional({ enum: Frequency, description: 'Tần suất', example: Frequency.daily })
  @IsOptional()
  @IsEnum(Frequency)
  frequency?: Frequency;

  @ApiPropertyOptional({
    description: 'Các ngày trong tuần (tuỳ ý, ví dụ: ["Mon","Wed","Fri"])',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  days_of_week?: string[] | null;

  // location removed

  @ApiPropertyOptional({ description: 'Ghi chú' })
  @IsOptional()
  @IsString()
  notes?: string | null;

  @ApiPropertyOptional({ description: 'Còn hiệu lực', default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class HabitsUpsertDto {
  @ApiProperty({ type: [HabitItemDto] })
  @IsArray()
  habits!: HabitItemDto[];
}
