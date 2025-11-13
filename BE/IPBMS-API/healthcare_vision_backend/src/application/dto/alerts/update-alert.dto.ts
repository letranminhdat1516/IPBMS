import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsString, IsObject, IsDate } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateAlertDto {
  @IsUUID()
  @IsOptional()
  @ApiProperty({ example: 'uuid-event', description: 'Event ID', required: false })
  event_id?: string;

  @IsUUID()
  @IsOptional()
  @ApiProperty({ example: 'uuid-user', description: 'User ID', required: false })
  user_id?: string;

  @IsOptional()
  @ApiProperty({ example: 'warning', description: 'Alert type', required: false })
  alert_type?: string;

  @IsOptional()
  @ApiProperty({ example: 'medium', description: 'Severity', required: false })
  severity?: string;

  @IsOptional()
  @ApiProperty({ example: 'Alert message', description: 'Alert message', required: false })
  alert_message?: string;

  @IsOptional()
  @ApiProperty({ example: {}, description: 'Alert data', required: false })
  alert_data?: object;

  @IsOptional()
  @ApiProperty({ example: 'active', description: 'Status', required: false })
  status?: string;

  @IsUUID()
  @IsOptional()
  @ApiProperty({ example: 'uuid-user', description: 'Acknowledged by', required: false })
  acknowledged_by?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  @ApiProperty({ example: '2024-06-01T12:00:00Z', description: 'Acknowledged at', required: false })
  acknowledged_at?: Date;

  @IsOptional()
  @ApiProperty({ example: 'Note', description: 'Resolution note', required: false })
  resolution_notes?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  @ApiProperty({ example: '2024-06-01T12:00:00Z', description: 'Resolved at', required: false })
  resolved_at?: Date;
}
