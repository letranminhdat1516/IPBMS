import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsString } from 'class-validator';

export class UpdateTicketDto {
  @ApiProperty({ example: 'uuid-user', description: 'User ID', required: false })
  @IsUUID()
  @IsOptional()
  user_id?: string;

  @ApiProperty({ example: 'support', description: 'Type', required: false })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiProperty({ example: 'Need help', description: 'Title', required: false })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ example: 'Description of request', description: 'Description', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}
