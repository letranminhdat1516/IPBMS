import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsISO8601, IsUUID } from 'class-validator';

export class SleepCheckinDto {
  @ApiProperty({ description: 'Trạng thái điểm danh', enum: ['sleep', 'awake'] })
  @IsEnum(['sleep', 'awake'], { message: 'state must be either "sleep" or "awake"' })
  state!: 'sleep' | 'awake';

  @ApiPropertyOptional({
    description: 'Thời gian điểm danh (ISO 8601). Nếu không có sẽ dùng thời gian hiện tại',
    example: '2025-11-07T07:00:00Z',
  })
  @IsOptional()
  @IsISO8601()
  timestamp?: string;

  @ApiPropertyOptional({ description: 'Nguồn điểm danh, ví dụ: app, device', example: 'app' })
  @IsOptional()
  @IsString()
  source?: string;

  // Optional references to link the checkin to a habit / medical history / supplement
  @ApiPropertyOptional({ description: 'Related habit id (UUID)', example: null })
  @IsOptional()
  @IsUUID()
  habit_id?: string | null;

  @ApiPropertyOptional({ description: 'Related medical history id (UUID)', example: null })
  @IsOptional()
  @IsUUID()
  medical_history_id?: string | null;

  @ApiPropertyOptional({ description: 'Related supplement id (UUID)', example: null })
  @IsOptional()
  @IsUUID()
  supplement_id?: string | null;
}
