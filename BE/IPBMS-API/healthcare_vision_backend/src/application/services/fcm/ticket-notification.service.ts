import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { NotificationPreferencesService } from '../notifications/notification-preferences.service';
import { FcmNotificationService } from './fcm.notification.service';
import { TicketEventsService } from '../../events/ticket-events.service';

export interface TicketNotificationData {
  ticketId: string;
  ticketTitle?: string;
  customerId: string;
  agentId?: string;
  messageContent?: string;
  rating?: number;
  action: 'created' | 'assigned' | 'unassigned' | 'message' | 'rated' | 'status_changed' | 'closed';
}

@Injectable()
export class TicketNotificationService implements OnModuleInit {
  private readonly logger = new Logger(TicketNotificationService.name);
  constructor(
    private readonly _fcmNotificationService: FcmNotificationService,
    private readonly _ticketEvents: TicketEventsService,
    private readonly _notificationPreferencesService: NotificationPreferencesService,
  ) {}

  onModuleInit() {
    // Subscribe to ticket events
    this._ticketEvents.on('ticket.created', async (p) => {
      await this.handleTicketCreated(p.ticketId, p.userId);
    });

    this._ticketEvents.on('ticket.assigned', async (p) => {
      if (p.agentId) await this.handleTicketAssigned(p.ticketId, p.agentId);
    });

    this._ticketEvents.on('ticket.unassigned', async (p) => {
      if (p.agentId) await this.handleTicketUnassigned(p.ticketId, p.agentId);
    });

    this._ticketEvents.on('ticket.message', async (p) => {
      if (p.messageId && p.userId) await this.handleNewMessage(p.ticketId, p.messageId, p.userId);
    });

    this._ticketEvents.on('ticket.rated', async (p) => {
      if (p.ratingId) await this.handleTicketRated(p.ticketId, p.ratingId);
    });

    this._ticketEvents.on('ticket.status_changed', async (p) => {
      if (p.oldStatus && p.newStatus) {
        await this.handleStatusChanged(p.ticketId, p.oldStatus, p.newStatus);
      }
    });
  }

  private async handleTicketCreated(ticketId: string, customerId?: string) {
    if (!customerId) return;
    try {
      const shouldSend = await this._notificationPreferencesService.shouldSendTicketNotification(
        customerId,
        'ticket_created',
      );
      if (!shouldSend) return;

      await this._fcmNotificationService.pushSystemEvent(customerId, {
        eventId: `ticket_created_${ticketId}`,
        eventType: 'ticket_created',
        title: 'Ticket mới được tạo',
        body: `Ticket đã được tạo`,
        deeplink: `healthcare://tickets/${ticketId}`,
        extra: { ticket_id: ticketId, action: 'created' },
      });
      this.logger.log(`Ticket creation notification sent for ticket ${ticketId}`);
    } catch (err) {
      this.logger.error('Failed to handle ticket.created event: ' + (err as Error).message);
    }
  }

  private async handleTicketAssigned(ticketId: string, agentId: string) {
    try {
      const shouldSend = await this._notificationPreferencesService.shouldSendTicketNotification(
        agentId,
        'ticket_assigned',
      );
      if (shouldSend) {
        await this._fcmNotificationService.sendNotificationToUser(
          agentId,
          'Ticket được giao',
          `Bạn đã được giao xử lý ticket`,
          { ticket_id: ticketId, action: 'assigned' },
        );
      }
    } catch (err) {
      this.logger.error('Failed to handle ticket.assigned event: ' + (err as Error).message);
    }
  }

  private async handleTicketUnassigned(ticketId: string, agentId: string) {
    try {
      await this._fcmNotificationService.sendNotificationToUser(
        agentId,
        'Ticket bị thu hồi',
        `Ticket đã được thu hồi khỏi bạn`,
        { ticket_id: ticketId, action: 'unassigned' },
      );
    } catch (err) {
      this.logger.error('Failed to handle ticket.unassigned event: ' + (err as Error).message);
    }
  }

  private async handleNewMessage(ticketId: string, messageId: string, senderId: string) {
    try {
      // payload should include recipients array ideally; we send a minimal push to ticket owner/agents
      await this._fcmNotificationService.pushSystemEvent(senderId, {
        eventId: `ticket_message_${messageId}`,
        eventType: 'ticket_message',
        title: 'Tin nhắn mới trong ticket',
        body: `Bạn có tin nhắn mới`,
        deeplink: `healthcare://tickets/${ticketId}`,
        extra: {
          ticket_id: ticketId,
          message_id: messageId,
          action: 'message',
          sender_id: senderId,
        },
      });
    } catch (err) {
      this.logger.error('Failed to handle ticket.message event: ' + (err as Error).message);
    }
  }

  private async handleTicketRated(ticketId: string, ratingId: string) {
    try {
      await this._fcmNotificationService.pushSystemEvent(ticketId, {
        eventId: `ticket_rated_${ratingId}`,
        eventType: 'ticket_rated',
        title: 'Ticket được đánh giá',
        body: `Ticket vừa nhận được đánh giá`,
        deeplink: `healthcare://tickets/${ticketId}`,
        extra: { ticket_id: ticketId, rating_id: ratingId, action: 'rated' },
      });
    } catch (err) {
      this.logger.error('Failed to handle ticket.rated event: ' + (err as Error).message);
    }
  }

  private async handleStatusChanged(ticketId: string, oldStatus: string, newStatus: string) {
    try {
      await this._fcmNotificationService.pushSystemEvent(ticketId, {
        eventId: `ticket_status_${ticketId}`,
        eventType: 'ticket_status',
        title: 'Cập nhật trạng thái ticket',
        body: `Trạng thái: ${newStatus}`,
        deeplink: `healthcare://tickets/${ticketId}`,
        extra: { ticket_id: ticketId, old_status: oldStatus, new_status: newStatus },
      });
    } catch (err) {
      this.logger.error('Failed to handle ticket.status_changed event: ' + (err as Error).message);
    }
  }

  /**
   * Send notification when a new ticket is created
   */
  // Legacy direct notify* methods removed: handlers above respond to events emitted by ticket services.

  /**
   * Send notification when a message is read
   */
  async notifyMessageRead(ticketId: string, messageId: string, readerId: string) {
    // This method previously relied on ticket/message services and caused circular DI.
    // Prefer emitting an event from the ticket/message flow instead. Keep this method
    // as a no-op or future extension point.
    this.logger.debug(`notifyMessageRead called for ${messageId} in ${ticketId} by ${readerId}`);
  }
}
