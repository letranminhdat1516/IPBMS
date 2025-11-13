import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OverviewAlertsSummaryDto {
  @ApiProperty({ type: Object }) bySeverity!: Record<
    'low' | 'medium' | 'high' | 'critical',
    number
  >;
  @ApiProperty({ type: Object }) byStatus!: Record<string, number>;
  @ApiPropertyOptional() emergencyToday?: number;
  @ApiPropertyOptional() importantToday?: number;
  @ApiPropertyOptional() info7d?: number;
  @ApiPropertyOptional() resolved30d?: number;
}

export class OverviewResponseDto {
  @ApiPropertyOptional() cameraActive?: string;
  @ApiPropertyOptional() monitorTime?: string;
  @ApiProperty() alertCount!: number;
  @ApiPropertyOptional({ type: Object }) aiAccuracy?: {
    fall?: number;
    activity?: number;
  };
  @ApiProperty({ type: OverviewAlertsSummaryDto })
  alertsSummary!: OverviewAlertsSummaryDto;
}
