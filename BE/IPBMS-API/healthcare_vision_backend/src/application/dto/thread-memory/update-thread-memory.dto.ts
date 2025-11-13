import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsObject, IsOptional, IsDate, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { parseJsonOrUndefined } from '../../../shared/utils';

export class UpdateThreadMemoryDto {
  @ApiProperty({ example: 'uuid-user', description: 'User ID', required: false })
  @IsString()
  @IsOptional()
  user_id?: string;

  @ApiProperty({ example: {}, description: 'Conversation history', required: false })
  @Transform(parseJsonOrUndefined)
  @IsObject()
  @IsOptional()
  conversation_history?: object;

  @ApiProperty({ example: {}, description: 'Context cache', required: false })
  @Transform(parseJsonOrUndefined)
  @IsObject()
  @IsOptional()
  context_cache?: object;

  @ApiProperty({ example: '2024-06-01T12:00:00Z', description: 'Last updated', required: false })
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  last_updated?: Date;

  @ApiProperty({ example: '2024-06-02T12:00:00Z', description: 'Expires at', required: false })
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  expires_at?: Date;

  @ApiProperty({ example: true, description: 'Is active', required: false })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
