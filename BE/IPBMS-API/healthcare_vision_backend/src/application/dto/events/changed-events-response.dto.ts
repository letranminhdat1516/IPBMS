import { ApiProperty } from '@nestjs/swagger';

export class ChangedEventDto {
  @ApiProperty({ description: 'Event UUID' })
  event_id!: string;

  @ApiProperty({ description: 'Owner user id (patient/customer)', nullable: true })
  user_id!: string | null;

  @ApiProperty({ description: 'ISO datetime of last change' })
  last_change_at!: string;

  @ApiProperty({
    description: 'Last action (proposed|edited|confirmed|rejected|cancelled|abandoned)',
  })
  last_action!: string;

  @ApiProperty({ description: 'Number of changes (entries) in audit for this event' })
  change_count!: number;
}

export class ChangedEventsResponseDto {
  @ApiProperty({ type: [ChangedEventDto] })
  items!: ChangedEventDto[];

  @ApiProperty({ description: 'Total matching events' })
  total!: number;

  @ApiProperty({ description: 'Page number' })
  page!: number;

  @ApiProperty({ description: 'Page size (limit)' })
  limit!: number;
}
