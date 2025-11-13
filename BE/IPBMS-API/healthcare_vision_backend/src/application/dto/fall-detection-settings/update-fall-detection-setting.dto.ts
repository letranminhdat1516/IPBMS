import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class UpdateFallDetectionSettingDto {
  @ApiProperty({ example: 5, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  abnormal_unconfirmed_streak?: number;

  @ApiProperty({ example: 30, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  abnormal_streak_window_minutes?: number;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  only_trigger_if_unconfirmed?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
