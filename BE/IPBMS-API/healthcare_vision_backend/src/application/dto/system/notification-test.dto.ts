import { ApiProperty } from '@nestjs/swagger';

export class NotificationPayloadDto {
  @ApiProperty({ example: 'Cảnh báo y tế' })
  title!: string;

  @ApiProperty({ example: 'Phát hiện ngã trong phòng khách' })
  body!: string;

  @ApiProperty({ example: 'default', required: false })
  sound?: string;

  @ApiProperty({ example: 'https://cdn.example/image.png', required: false })
  image?: string;
}

export class NotificationTestDto {
  @ApiProperty({ type: NotificationPayloadDto })
  notification!: NotificationPayloadDto;

  @ApiProperty({
    example: { event_id: 'evt_1', event_type: 'fall', urgent: 'true', status: 'danger' },
  })
  data!: Record<string, any>;
}
