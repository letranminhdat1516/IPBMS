import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MonitoringSettingsDto {
  @ApiProperty() fallDetection!: boolean;
  @ApiProperty() sleepMonitoring!: boolean;
  @ApiProperty() medicationReminders!: boolean;
  @ApiProperty() abnormalDetection!: boolean;
  @ApiProperty({ enum: ['low', 'medium', 'high'] }) sensitivity!: 'low' | 'medium' | 'high';
  @ApiProperty() maxSitMinutes!: number;
  @ApiProperty({ type: [String] }) notifyChannels!: string[];
}

export class MonitoringAnalytics24hDto {
  @ApiProperty() normalWalkCount!: number;
  @ApiProperty() sitLieMinutes!: number;
  @ApiProperty() abnormalCount!: number;
  @ApiProperty() emergencyCount!: number;
  @ApiPropertyOptional({ type: Object }) aiAccuracy?: {
    fall?: number;
    activity?: number;
  };
}

export class MonitoringTimelineItemDto {
  @ApiProperty() time!: string;
  @ApiProperty() activity!: string;
  @ApiPropertyOptional() location?: string;
  @ApiProperty() type!: string;
  @ApiPropertyOptional() duration?: number;
}

export class MonitoringResponseDto {
  @ApiPropertyOptional({ type: MonitoringSettingsDto })
  settings?: MonitoringSettingsDto;
  @ApiPropertyOptional({ type: MonitoringAnalytics24hDto })
  analytics24h?: MonitoringAnalytics24hDto;
  @ApiPropertyOptional({ type: MonitoringTimelineItemDto, isArray: true })
  timeline?: MonitoringTimelineItemDto[];
  @ApiPropertyOptional({ description: 'Ngày được yêu cầu (YYYY-MM-DD)' })
  date?: string;
}
