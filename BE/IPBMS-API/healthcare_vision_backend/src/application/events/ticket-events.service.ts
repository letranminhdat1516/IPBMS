import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';

export interface TicketEventPayload {
  ticketId: string;
  userId?: string;
  agentId?: string;
  messageId?: string;
  ratingId?: string;
  oldStatus?: string;
  newStatus?: string;
}

@Injectable()
export class TicketEventsService {
  private readonly emitter = new EventEmitter();

  emit(event: string, payload: TicketEventPayload) {
    this.emitter.emit(event, payload);
  }

  on(event: string, handler: (_payload: TicketEventPayload) => void) {
    this.emitter.on(event, handler);
  }
}
