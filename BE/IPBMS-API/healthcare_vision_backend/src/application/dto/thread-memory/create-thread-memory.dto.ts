import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsObject, IsOptional, IsDate, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { parseJsonOrUndefined } from '../../../shared/utils';

export class CreateThreadMemoryDto {
  @ApiProperty({ example: 'uuid-user', description: 'User ID', required: true })
  @IsString()
  user_id!: string;

  @ApiProperty({ example: {}, description: 'Conversation history' })
  @Transform(parseJsonOrUndefined)
  @IsObject()
  @IsOptional()
  conversation_history?: object;

  @ApiProperty({ example: {}, description: 'Context cache' })
  @Transform(parseJsonOrUndefined)
  @IsObject()
  @IsOptional()
  context_cache?: object;

  @ApiProperty({ example: '2024-06-01T12:00:00Z', description: 'Last updated' })
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  last_updated?: Date;

  @ApiProperty({ example: '2024-06-02T12:00:00Z', description: 'Expires at' })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  expires_at?: Date;

  @ApiProperty({ example: true, description: 'Is active' })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
