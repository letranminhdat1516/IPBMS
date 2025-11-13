import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsObject, IsBoolean, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';
import { parseJsonOrUndefined } from '../../../shared/utils/transform.util';

export class UpdateAiConfigurationDto {
  @ApiProperty({ example: 'uuid-user', description: 'User ID', required: false })
  @IsOptional()
  @IsUUID()
  user_id?: string;

  @ApiProperty({ example: {}, description: 'Patient profile', required: false })
  @IsOptional()
  @Transform(parseJsonOrUndefined)
  @IsObject()
  patient_profile_context?: object;

  @ApiProperty({ example: {}, description: 'Behavior rules', required: false })
  @IsOptional()
  @Transform(parseJsonOrUndefined)
  @IsObject()
  behavior_rules?: object;

  @ApiProperty({ example: {}, description: 'Model settings', required: false })
  @IsOptional()
  @Transform(parseJsonOrUndefined)
  @IsObject()
  model_settings?: object;

  @ApiProperty({ example: {}, description: 'Detection thresholds', required: false })
  @IsOptional()
  @Transform(parseJsonOrUndefined)
  @IsObject()
  detection_thresholds?: object;

  @ApiProperty({ example: true, description: 'Is active', required: false })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiProperty({ example: '2024-06-01T12:00:00Z', description: 'Created at', required: false })
  @IsOptional()
  @IsDateString()
  created_at?: Date;

  @ApiProperty({ example: '2024-06-01T12:00:00Z', description: 'Updated at', required: false })
  @IsOptional()
  @IsDateString()
  updated_at?: Date;

  @ApiProperty({ example: 'uuid-admin', description: 'Created by', required: false })
  @IsOptional()
  @IsUUID()
  created_by?: string;
}
