// src/application/dto/activity-logs/filter-actor-name.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class FilterActorNameDto {
  @ApiPropertyOptional({ description: 'Lọc theo tên người thực hiện log (actor_name)' })
  @IsOptional()
  @IsString()
  actor_name?: string;
}
