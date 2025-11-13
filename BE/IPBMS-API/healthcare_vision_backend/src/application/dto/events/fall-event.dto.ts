import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class FallEventDto {
  @ApiProperty({
    description: 'ID của user (bệnh nhân)',
    example: '6b7c0cbe-bc12-43a7-9d2a-fcfa8a76b0f5',
  })
  @IsString()
  userId!: string;

  @ApiProperty({
    description: 'ID của sự kiện fall đã insert vào DB',
    example: 'f84d91bc-015a-4ee1-9d2f-b2d3ff798d0d',
  })
  @IsString()
  eventId!: string;

  @ApiProperty({
    description: 'Risk score (0-1) đánh giá mức độ nguy hiểm từ AI',
    required: false,
    example: 0.85,
  })
  @IsOptional()
  @IsNumber()
  riskScore?: number;

  @ApiProperty({
    description: 'Đánh dấu fall này là high-risk nếu đã đánh giá rồi',
    required: false,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isHighRisk?: boolean;

  @ApiProperty({
    description: 'Có nên cộng thêm 1 vào thống kê hôm nay không (nếu event chưa insert trước đó)',
    required: false,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  includeCurrent?: boolean;
}

export class FallEventResponseDto {
  @ApiProperty()
  dangerEventsToday?: number;

  @ApiProperty()
  highRiskFallsToday?: number;

  @ApiProperty()
  thresholdReached?: boolean;

  @ApiProperty()
  alerted?: boolean;

  @ApiProperty({ required: false })
  alertId?: string;
}
