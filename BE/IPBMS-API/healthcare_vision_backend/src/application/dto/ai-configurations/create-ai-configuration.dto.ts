import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsObject, IsBoolean, IsDateString, IsNotEmpty } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { parseJsonOrUndefined, emptyToUndefined } from '../../../shared/utils/transform.util';

export class CreateAiConfigurationDto {
  @ApiProperty({ example: 'uuid-user', description: 'User ID' })
  @IsNotEmpty()
  @IsUUID()
  user_id!: string;

  @ApiProperty({ example: {}, description: 'Patient profile' })
  @IsOptional()
  @Transform(parseJsonOrUndefined)
  @IsObject()
  patient_profile_context?: object;

  @ApiProperty({ example: {}, description: 'Behavior rules' })
  @IsOptional()
  @Transform(parseJsonOrUndefined)
  @IsObject()
  behavior_rules?: object;

  @ApiProperty({ example: {}, description: 'Model settings' })
  @IsOptional()
  @Transform(parseJsonOrUndefined)
  @IsObject()
  model_settings?: object;

  @ApiProperty({ example: {}, description: 'Detection thresholds' })
  @IsOptional()
  @Transform(parseJsonOrUndefined)
  @IsObject()
  detection_thresholds?: object;

  @ApiProperty({ example: true, description: 'Is active' })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiProperty({ example: '2024-06-01T12:00:00Z', description: 'Created at' })
  @IsOptional()
  @IsDateString()
  @Type(() => Date)
  created_at?: Date;

  @ApiProperty({ example: '2024-06-01T12:00:00Z', description: 'Updated at' })
  @IsOptional()
  @IsDateString()
  @Type(() => Date)
  updated_at?: Date;

  @ApiProperty({ example: 'uuid-admin', description: 'Created by' })
  @IsOptional()
  @IsUUID()
  created_by?: string;
}
