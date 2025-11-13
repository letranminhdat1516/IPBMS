import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, Min } from 'class-validator';

export class CreateFallDetectionSettingDto {
  @ApiProperty({ example: 5 })
  @IsInt()
  @Min(1)
  abnormal_unconfirmed_streak!: number;

  @ApiProperty({ example: 30 })
  @IsInt()
  @Min(1)
  abnormal_streak_window_minutes!: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  only_trigger_if_unconfirmed!: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  enabled!: boolean;
}
