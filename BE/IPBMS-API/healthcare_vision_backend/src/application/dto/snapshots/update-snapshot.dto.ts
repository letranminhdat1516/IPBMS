import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean, IsDate, IsObject } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { parseJsonOrUndefined } from '../../../shared/utils';

export class UpdateSnapshotDto {
  @ApiProperty({ example: 'uuid-camera', required: false })
  @IsString()
  @IsOptional()
  camera_id?: string;

  @ApiProperty({ example: 'uuid-room', required: false })
  @IsString()
  @IsOptional()
  room_id?: string;

  @ApiProperty({ example: 'uuid-user', required: false })
  @IsString()
  @IsOptional()
  user_id?: string;

  @ApiProperty({ name: 'image_file', type: 'string', format: 'binary', required: false })
  image_file?: any;

  @ApiProperty({ example: { key: 'value' }, description: 'Additional metadata', required: false })
  @IsObject()
  @Transform(parseJsonOrUndefined)
  metadata?: object;

  @ApiProperty({ example: 'scheduled', required: false })
  @IsString()
  @IsOptional()
  capture_type?: string;

  @ApiProperty({ example: '2024-06-01T12:00:00Z', required: false })
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  captured_at?: Date;

  @ApiProperty({ example: '2024-06-01T12:05:00Z', required: false })
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  processed_at?: Date;

  @ApiProperty({ example: false, required: false })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  is_processed?: boolean;
}
