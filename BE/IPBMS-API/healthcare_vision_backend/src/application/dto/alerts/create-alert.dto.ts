import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty, IsString, IsOptional, IsObject, IsDate } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { parseJsonOrUndefined } from '../../../shared/utils';

export class CreateAlertDto {
  @IsUUID()
  @IsNotEmpty()
  @ApiProperty({ example: 'uuid-event', description: 'Event ID' })
  event_id!: string;

  @IsUUID()
  @IsNotEmpty()
  @ApiProperty({ example: 'uuid-user', description: 'User ID' })
  user_id!: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'warning', description: 'Alert type', required: false })
  alert_type?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'medium', description: 'Severity', required: false })
  severity?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'Alert message', description: 'Alert message', required: false })
  alert_message?: string;

  @IsOptional()
  @Transform(parseJsonOrUndefined)
  @IsObject()
  @ApiProperty({ example: { liều: '1 viên' }, description: 'Alert data', required: false })
  alert_data?: object;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'active', description: 'Status', required: false })
  status?: string;

  @IsOptional()
  @IsUUID()
  @ApiProperty({ example: 'uuid-user', description: 'Acknowledged by', required: false })
  acknowledged_by?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  @ApiProperty({ example: '2024-06-01T12:00:00Z', description: 'Acknowledged at', required: false })
  acknowledged_at?: Date;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'Note', description: 'Resolution note', required: false })
  resolution_notes?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  @ApiProperty({ example: '2024-06-01T12:00:00Z', description: 'Resolved at', required: false })
  resolved_at?: Date;
}
