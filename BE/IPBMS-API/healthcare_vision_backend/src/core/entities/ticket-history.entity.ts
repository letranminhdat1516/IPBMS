import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Ticket } from './ticket.entity';

export enum HistoryAction {
  CREATED = 'created',
  UPDATED = 'updated',
  STATUS_CHANGED = 'status_changed',
  ASSIGNED = 'assigned',
  UNASSIGNED = 'unassigned',
  MESSAGE_ADDED = 'message_added',
  RATED = 'rated',
  CLOSED = 'closed',
  REOPENED = 'reopened',
}

@Entity('ticket_history')
@Index(['ticket_id', 'created_at'])
export class TicketHistory {
  @ApiProperty({ example: 'uuid-history-1', description: 'Unique history entry identifier' })
  @PrimaryGeneratedColumn('uuid')
  history_id!: string;

  @ApiProperty({ example: 'uuid-ticket-1', description: 'Associated ticket ID' })
  @Column({ type: 'uuid' })
  ticket_id!: string;

  @ApiProperty({ example: 'uuid-user-1', description: 'User ID who performed the action' })
  @Column({ type: 'uuid' })
  user_id!: string; // Who performed the action

  @ApiProperty({
    enum: HistoryAction,
    example: HistoryAction.ASSIGNED,
    description: 'Type of history action',
  })
  @Column({
    type: 'enum',
    enum: HistoryAction,
  })
  action!: HistoryAction;

  @ApiProperty({ example: null, description: 'Old values before the action', required: false })
  @Column({ type: 'jsonb', nullable: true })
  old_values!: Record<string, any> | null;

  @ApiProperty({ example: null, description: 'New values after the action', required: false })
  @Column({ type: 'jsonb', nullable: true })
  new_values!: Record<string, any> | null;

  @ApiProperty({
    example: 'Assigned to agent for triage',
    description: 'Short description of the change',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @ApiProperty({
    example: null,
    description: 'Optional metadata for the history entry',
    required: false,
  })
  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @ApiProperty({
    example: '2025-10-17T12:35:00.000Z',
    description: 'When the history entry was created',
  })
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  // Relations
  @ManyToOne(() => Ticket, (ticket) => ticket.ticket_id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticket_id' })
  ticket!: Ticket;
}
