import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export class SortQueryDto<TFields extends string = 'created_at'> {
  @ApiPropertyOptional({ default: 'created_at' })
  @IsOptional()
  orderBy?: TFields | string = 'created_at';

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], default: 'DESC' })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  order?: 'ASC' | 'DESC' = 'DESC';
}
