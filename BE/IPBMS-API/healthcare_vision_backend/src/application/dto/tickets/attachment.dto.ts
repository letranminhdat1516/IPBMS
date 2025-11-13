import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, IsNumber, IsOptional } from 'class-validator';

/**
 * Attachment data transfer object used in ticket messages and attachments
 */
export class AttachmentDto {
  @ApiProperty({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'Attachment file id (UUID)',
  })
  @IsUUID()
  file_id!: string;

  @ApiProperty({ example: 'photo.png', description: 'Original file name' })
  @IsString()
  file_name!: string;

  @ApiProperty({
    example: 'https://cdn.example.com/files/photo.png',
    description: 'Publicly accessible URL to the file',
  })
  @IsString()
  file_url!: string;

  @ApiProperty({ example: 204800, description: 'File size in bytes' })
  @IsNumber()
  file_size!: number;

  @ApiProperty({ example: 'image/png', description: 'MIME type of the file' })
  @IsString()
  mime_type!: string;

  @ApiProperty({
    example: 'optional description',
    description: 'Optional human-readable description for the attachment',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;
}
