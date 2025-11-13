import { IsNotEmpty, IsString, IsOptional, IsEnum, IsInt, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum CameraTypeEnum {
  ip = 'ip',
  analog = 'analog',
}

export enum CameraStatusEnum {
  active = 'active',
  inactive = 'inactive',
}

export class CreateCameraDto {
  @ApiProperty({ example: 'user-uuid', description: 'User ID (customer) who owns the camera' })
  @IsNotEmpty()
  @IsString()
  user_id!: string;
  @ApiProperty({ example: 'room-uuid', description: 'Room ID chứa camera' })
  @IsOptional()
  @IsString()
  room_id?: string;

  @ApiProperty({ example: 'Camera 1', description: 'Camera name' })
  @IsNotEmpty()
  @IsString()
  camera_name!: string;

  @ApiProperty({ example: 'ip', enum: CameraTypeEnum, description: 'Camera type' })
  @IsOptional()
  @IsEnum(CameraTypeEnum)
  camera_type?: CameraTypeEnum = CameraTypeEnum.ip;

  @ApiProperty({ example: '192.168.1.10', description: 'IP address' })
  @IsOptional()
  @IsString()
  ip_address?: string;

  @ApiProperty({ example: 554, description: 'Port' })
  @IsOptional()
  @IsInt()
  port?: number;

  @ApiProperty({ example: 'rtsp://...', description: 'RTSP URL' })
  @IsOptional()
  @IsString()
  rtsp_url?: string;

  @ApiProperty({ example: 'admin', description: 'Username' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ example: 'password', description: 'Password' })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiProperty({ example: 'corner', description: 'Location in room' })
  @IsOptional()
  @IsString()
  location_in_room?: string;

  @ApiProperty({ example: '1920x1080', description: 'Resolution' })
  @IsOptional()
  @IsString()
  resolution?: string;

  @ApiProperty({ example: 30, description: 'Frames per second' })
  @IsOptional()
  @IsInt()
  fps?: number;

  @ApiProperty({ example: '2025-08-19T03:50:53.000Z', description: 'Thời gian ping cuối cùng' })
  @IsOptional()
  @IsString()
  last_ping?: string;

  @ApiProperty({
    example: '2025-08-19T03:50:53.000Z',
    description: 'Thời gian heartbeat cuối cùng',
  })
  @IsOptional()
  @IsString()
  last_heartbeat_at?: string;

  @ApiProperty({ example: 'active', enum: CameraStatusEnum, description: 'Camera status' })
  @IsOptional()
  @IsEnum(CameraStatusEnum)
  status?: CameraStatusEnum = CameraStatusEnum.active;

  @ApiProperty({ example: true, description: 'Is online' })
  @IsOptional()
  @IsBoolean()
  is_online?: boolean;
}
