import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { parseJsonOrUndefined } from '../../../shared/utils';

export class UpdateImageSettingDto {
  @ApiProperty({
    description: 'Giá trị mới cho image setting',
    example: 'high',
  })
  @IsNotEmpty()
  @IsString()
  value!: string;
}

export class ToggleImageSettingDto {
  @ApiProperty({
    description: 'Trạng thái bật/tắt cho image setting',
    example: true,
  })
  @IsNotEmpty()
  @IsBoolean()
  enabled!: boolean;
}

export class ImageSettingDto {
  @ApiProperty({
    description: 'Key của image setting',
    example: 'resolution',
  })
  @IsString()
  key!: string;

  @ApiProperty({
    description: 'Giá trị của image setting',
    example: 'high',
  })
  @IsString()
  value!: string;

  @ApiPropertyOptional({
    description: 'Mô tả về image setting',
    example: 'Image resolution setting',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Trạng thái enabled/disabled',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class BatchSaveImageSettingsDto {
  @ApiProperty({
    description: 'Object chứa tất cả image settings cần lưu',
    example: {
      quality: 'high',
      resolution: '1080p',
      auto_upload: true,
      wifi_only: false,
      compression_level: 80,
      max_file_size: '50MB',
    },
  })
  @IsNotEmpty()
  @IsObject()
  @Transform(parseJsonOrUndefined)
  settings!: Record<string, any>;
}
