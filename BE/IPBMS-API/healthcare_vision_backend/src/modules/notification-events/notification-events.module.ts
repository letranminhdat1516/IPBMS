import { Module } from '@nestjs/common';
import { TicketEventsService } from '../../application/events/ticket-events.service';

@Module({
  providers: [TicketEventsService],
  exports: [TicketEventsService],
})
export class NotificationEventsModule {}
