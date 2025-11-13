import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean, IsDate, IsObject, IsEnum } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { parseJsonOrUndefined } from '../../../shared/utils';
import { capture_type_enum } from '@prisma/client';

export class CreateSnapshotDto {
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

  @ApiProperty({
    name: 'image_files',
    type: 'string',
    format: 'binary',
    isArray: true,
    required: false,
  })
  image_files?: any[];

  @ApiProperty({ example: { key: 'value' }, required: false })
  @IsObject()
  @IsOptional()
  @Transform(parseJsonOrUndefined)
  metadata?: object;

  @ApiProperty({ example: 'scheduled', enum: capture_type_enum, required: false })
  @IsEnum(capture_type_enum)
  @IsOptional()
  capture_type?: capture_type_enum;

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
