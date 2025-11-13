import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty, IsString, IsBoolean, IsOptional } from 'class-validator';

export class CreateCameraSettingDto {
  @ApiProperty({ example: 'uuid-camera', description: 'Camera ID' })
  @IsUUID()
  @IsNotEmpty()
  camera_id!: string;

  @ApiProperty({ example: 'resolution', description: 'Setting name' })
  @IsString()
  @IsNotEmpty()
  setting_name!: string;

  @ApiProperty({ example: '1080p', description: 'Setting value' })
  @IsString()
  @IsNotEmpty()
  setting_value!: string;

  @ApiProperty({ example: 'string', description: 'Data type' })
  @IsString()
  @IsOptional()
  data_type?: string;

  @ApiProperty({ example: 'Resolution setting', description: 'Description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: true, description: 'Is active' })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
