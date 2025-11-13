import { ApiProperty } from '@nestjs/swagger';

export class ResolvedAttachmentDto {
  @ApiProperty({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'Upload record id (UUID)',
  })
  file_id!: string;

  @ApiProperty({ example: 'photo.png', description: 'Canonical filename stored in uploads' })
  file_name!: string;

  @ApiProperty({
    example: 'https://cdn.example.com/files/photo.png',
    description: 'Canonical URL to file',
  })
  file_url!: string;

  @ApiProperty({ example: 204800, description: 'File size in bytes' })
  file_size!: number;

  @ApiProperty({ example: 'image/png', description: 'MIME type' })
  mime_type!: string;

  @ApiProperty({
    example: 'optional description',
    description: 'Optional human-readable description',
    required: false,
  })
  description?: string;
}
