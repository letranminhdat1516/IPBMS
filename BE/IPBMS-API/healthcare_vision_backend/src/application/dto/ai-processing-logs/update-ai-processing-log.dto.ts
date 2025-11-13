import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsString, IsObject, IsNumber, IsDateString } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { parseJsonOrUndefined } from '../../../shared/utils';

export class UpdateAiProcessingLogDto {
  @ApiProperty({ example: 'uuid-snapshot', description: 'Snapshot ID', required: false })
  @IsOptional()
  @IsUUID()
  snapshot_id?: string;

  @ApiProperty({ example: 'uuid-user', description: 'User ID', required: false })
  @IsOptional()
  @IsUUID()
  user_id?: string;

  @ApiProperty({ example: 'stage1', description: 'Processing stage', required: false })
  @IsOptional()
  @IsString()
  processing_stage?: string;

  @ApiProperty({ example: {}, description: 'Input data', required: false })
  @IsOptional()
  @IsObject()
  @Transform(parseJsonOrUndefined)
  input_data?: object;

  @ApiProperty({ example: {}, description: 'Output data', required: false })
  @IsOptional()
  @IsObject()
  @Transform(parseJsonOrUndefined)
  output_data?: object;

  @ApiProperty({ example: 10, description: 'Processing time in seconds', required: false })
  @IsOptional()
  @IsNumber()
  processing_time_ms?: number;

  @ApiProperty({ example: 'success', description: 'Result status', required: false })
  @IsOptional()
  @IsString()
  result_status?: string;

  @ApiProperty({ example: 'Error message', description: 'Error message', required: false })
  @IsOptional()
  @IsString()
  error_message?: string;

  @ApiProperty({ example: 'v1.0', description: 'Model version', required: false })
  @IsOptional()
  @IsString()
  model_version?: string;

  @ApiProperty({ example: '2024-06-01T12:00:00Z', description: 'Processed at', required: false })
  @IsOptional()
  @IsDateString()
  @Type(() => Date)
  processed_at?: Date;
}
