import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsString, IsBoolean, IsOptional } from 'class-validator';

export class UpdateCameraSettingDto {
  @ApiProperty({ example: 'uuid-camera', description: 'Camera ID', required: false })
  @IsUUID()
  @IsOptional()
  camera_id?: string;

  @ApiProperty({ example: 'resolution', description: 'Setting name', required: false })
  @IsString()
  @IsOptional()
  setting_name?: string;

  @ApiProperty({ example: '1080p', description: 'Setting value', required: false })
  @IsString()
  @IsOptional()
  setting_value?: string;

  @ApiProperty({ example: 'string', description: 'Data type', required: false })
  @IsString()
  @IsOptional()
  data_type?: string;

  @ApiProperty({ example: 'Resolution setting', description: 'Description', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: true, description: 'Is active', required: false })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
