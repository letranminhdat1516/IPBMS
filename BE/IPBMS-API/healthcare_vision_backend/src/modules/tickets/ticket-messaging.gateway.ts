import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { HistoryService } from './history.service';
import { TicketsService } from '../../application/services/tickets.service';

interface ConnectedUser {
  userId: string;
  role: string;
  ticketId?: string; // For ticket-specific connections
}

interface TicketMessagePayload {
  ticketId: string;
  content: string;
  messageType?: string;
  attachments?: any[];
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  },
  namespace: '/ticket-messaging',
})
export class TicketMessagingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(TicketMessagingGateway.name);

  // Map socketId -> user info
  private connectedUsers = new Map<string, ConnectedUser>();
  // Map ticketId -> Set of socketIds
  private ticketRooms = new Map<string, Set<string>>();
  // Map userId -> Set of socketIds
  private userSockets = new Map<string, Set<string>>();

  constructor(
    private readonly _jwtService: JwtService,
    private readonly _historyService: HistoryService,
    private readonly _ticketsService: TicketsService,
  ) {}

  async handleConnection(client: Socket, ..._args: any[]) {
    try {
      const token = client.handshake.auth.token || client.handshake.query.token;
      if (!token) {
        this.logger.warn(`Connection rejected: No token provided`);
        client.disconnect();
        return;
      }

      const payload = this._jwtService.verify(token);
      const userId = payload.userId;
      const role = payload.role;

      this.connectedUsers.set(client.id, { userId, role });
      this.addUserSocket(userId, client.id);

      this.logger.log(`User ${userId} connected with socket ${client.id}`);

      // Send welcome message
      client.emit('connected', {
        message: 'Connected to ticket messaging',
        userId,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(`Connection failed: ${(error as Error).message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const user = this.connectedUsers.get(client.id);
    if (user) {
      this.logger.log(`User ${user.userId} disconnected from socket ${client.id}`);

      // Remove from user sockets
      this.removeUserSocket(user.userId, client.id);

      // Remove from ticket rooms
      if (user.ticketId) {
        this.leaveTicketRoom(user.ticketId, client.id);
      }

      this.connectedUsers.delete(client.id);
    }
  }

  @SubscribeMessage('join-ticket')
  async handleJoinTicket(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { ticketId: string },
  ) {
    const user = this.connectedUsers.get(client.id);
    if (!user) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    try {
      // Verify user has access to this ticket
      const ticket = await this._ticketsService.findById(data.ticketId);
      if (!ticket) {
        client.emit('error', { message: 'Ticket not found' });
        return;
      }

      // Check permissions
      const isOwner = ticket.user_id === user.userId;
      const isAdmin = user.role === 'admin';
      const isCaregiver = user.role === 'caregiver';

      if (!isOwner && !isAdmin && !isCaregiver) {
        client.emit('error', { message: 'Unauthorized to access this ticket' });
        return;
      }

      // Join the ticket room
      this.joinTicketRoom(data.ticketId, client.id);
      user.ticketId = data.ticketId;

      this.logger.log(`User ${user.userId} joined ticket room ${data.ticketId}`);

      client.emit('joined-ticket', {
        ticketId: data.ticketId,
        message: 'Successfully joined ticket room',
        timestamp: new Date(),
      });

      // Send recent messages
      // Fetch timeline and filter message events
      const timeline = await this._historyService.getTicketTimeline(data.ticketId);
      const messages = timeline
        .filter((h) => h.action === 'message_added')
        .map((h) => ({
          message_id: h.history_id,
          ticket_id: h.ticket_id,
          sender_id: h.user_id,
          message_type: h.metadata?.message_type ?? 'text',
          content: h.metadata?.content ?? null,
          attachments: h.metadata?.attachments ?? null,
          created_at: h.created_at,
        }));
      client.emit('recent-messages', messages);
    } catch (error) {
      this.logger.error(`Error joining ticket room: ${(error as Error).message}`);
      client.emit('error', { message: 'Failed to join ticket room' });
    }
  }

  @SubscribeMessage('leave-ticket')
  handleLeaveTicket(@ConnectedSocket() client: Socket) {
    const user = this.connectedUsers.get(client.id);
    if (user && user.ticketId) {
      this.leaveTicketRoom(user.ticketId, client.id);
      this.logger.log(`User ${user.userId} left ticket room ${user.ticketId}`);
      user.ticketId = undefined;

      client.emit('left-ticket', {
        message: 'Successfully left ticket room',
        timestamp: new Date(),
      });
    }
  }

  @SubscribeMessage('send-message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: TicketMessagePayload,
  ) {
    const user = this.connectedUsers.get(client.id);
    if (!user) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    try {
      // Log message as a history event and broadcast a simplified message object
      await this._historyService.logMessageAdded(
        data.ticketId,
        user.userId,
        data.messageType || 'text',
      );
      const message = {
        message_id: `hist_${Date.now()}`,
        ticket_id: data.ticketId,
        sender_id: user.userId,
        message_type: data.messageType || 'text',
        content: data.content,
        attachments: data.attachments,
        created_at: new Date(),
      };

      this.server.to(`ticket-${data.ticketId}`).emit('new-message', message);
      client.emit('message-sent', message);

      this.logger.log(`Message sent in ticket ${data.ticketId} by user ${user.userId}`);
    } catch (error) {
      this.logger.error(`Error sending message: ${(error as Error).message}`);
      client.emit('error', { message: 'Failed to send message' });
    }
  }

  @SubscribeMessage('mark-message-read')
  async handleMarkMessageRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: string },
  ) {
    const user = this.connectedUsers.get(client.id);
    if (!user) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    try {
      // mark-as-read: we don't have a separate messages table after migration.
      // Emit a message-read event to notify clients. Persistent read state should be implemented
      // by storing read events in ticket_history if required.
      const ticketRoom = Array.from(this.ticketRooms.entries()).find(([_, sockets]) =>
        sockets.has(client.id),
      );
      if (ticketRoom) {
        const [ticketId] = ticketRoom;
        this.server.to(`ticket-${ticketId}`).emit('message-read', {
          messageId: data.messageId,
          readBy: user.userId,
          readAt: new Date(),
        });
      }
    } catch (error) {
      this.logger.error(`Error marking message as read: ${(error as Error).message}`);
      client.emit('error', { message: 'Failed to mark message as read' });
    }
  }

  @SubscribeMessage('typing-start')
  handleTypingStart(@ConnectedSocket() client: Socket, @MessageBody() data: { ticketId: string }) {
    const user = this.connectedUsers.get(client.id);
    if (user) {
      // Broadcast typing indicator to other users in the room
      client.to(`ticket-${data.ticketId}`).emit('user-typing', {
        userId: user.userId,
        ticketId: data.ticketId,
        isTyping: true,
      });
    }
  }

  @SubscribeMessage('typing-stop')
  handleTypingStop(@ConnectedSocket() client: Socket, @MessageBody() data: { ticketId: string }) {
    const user = this.connectedUsers.get(client.id);
    if (user) {
      // Broadcast typing indicator to other users in the room
      client.to(`ticket-${data.ticketId}`).emit('user-typing', {
        userId: user.userId,
        ticketId: data.ticketId,
        isTyping: false,
      });
    }
  }

  // Helper methods
  private joinTicketRoom(ticketId: string, socketId: string) {
    if (!this.ticketRooms.has(ticketId)) {
      this.ticketRooms.set(ticketId, new Set());
    }
    this.ticketRooms.get(ticketId)!.add(socketId);

    const socket = this.server.sockets.sockets.get(socketId);
    if (socket) {
      socket.join(`ticket-${ticketId}`);
    }
  }

  private leaveTicketRoom(ticketId: string, socketId: string) {
    const room = this.ticketRooms.get(ticketId);
    if (room) {
      room.delete(socketId);
      if (room.size === 0) {
        this.ticketRooms.delete(ticketId);
      }
    }

    const socket = this.server.sockets.sockets.get(socketId);
    if (socket) {
      socket.leave(`ticket-${ticketId}`);
    }
  }

  private addUserSocket(userId: string, socketId: string) {
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(socketId);
  }

  private removeUserSocket(userId: string, socketId: string) {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.delete(socketId);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }
  }

  // Public method to send notifications from other services
  notifyTicketUpdate(ticketId: string, event: string, data: any) {
    this.server.to(`ticket-${ticketId}`).emit('ticket-update', {
      event,
      data,
      timestamp: new Date(),
    });
  }

  notifyUser(userId: string, event: string, data: any) {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.forEach((socketId) => {
        const socket = this.server.sockets.sockets.get(socketId);
        if (socket) {
          socket.emit(event, data);
        }
      });
    }
  }
}
