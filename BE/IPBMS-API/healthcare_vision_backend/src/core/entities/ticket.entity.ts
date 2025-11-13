import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { TicketHistory } from './ticket-history.entity';

export enum TicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum TicketCategory {
  TECHNICAL = 'technical',
  BILLING = 'billing',
  ACCOUNT = 'account',
  FEATURE_REQUEST = 'feature_request',
  BUG_REPORT = 'bug_report',
  GENERAL = 'general',
}

export enum TicketStatus {
  NEW = 'new',
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  WAITING_FOR_CUSTOMER = 'waiting_for_customer',
  WAITING_FOR_AGENT = 'waiting_for_agent',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

@Entity('support_tickets')
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({
    example: 'uuid-ticket-1',
    description: 'Unique ticket identifier',
  })
  ticket_id!: string;

  @ApiProperty({
    example: 'uuid-user-1',
    description: 'User ID (owner of the ticket)',
  })
  @Column({ type: 'uuid' })
  user_id!: string;

  @ApiProperty({
    enum: TicketCategory,
    example: TicketCategory.TECHNICAL,
    description: 'Category of the ticket',
  })
  @Column({
    type: 'enum',
    enum: TicketCategory,
    default: TicketCategory.GENERAL,
  })
  category!: TicketCategory;

  @ApiProperty({
    enum: TicketPriority,
    example: TicketPriority.MEDIUM,
    description: 'Priority/severity of the ticket',
  })
  @Column({
    type: 'enum',
    enum: TicketPriority,
    default: TicketPriority.MEDIUM,
  })
  priority!: TicketPriority;

  @ApiProperty({
    enum: TicketStatus,
    example: TicketStatus.NEW,
    description: 'Current status of the ticket',
  })
  @Column({
    type: 'enum',
    enum: TicketStatus,
    default: TicketStatus.NEW,
  })
  status!: TicketStatus;

  @ApiProperty({
    example: 'uuid-agent-1',
    description: 'Assigned agent user ID (if assigned)',
    required: false,
  })
  @Column({ type: 'varchar', nullable: true })
  assigned_to!: string | null; // Agent user_id

  @ApiProperty({
    example: 'Cannot login to account',
    description: 'Short title/summary of the ticket',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
  title!: string | null;

  @ApiProperty({
    example: 'I get an error when trying to login...',
    description: 'Detailed description of the issue',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @ApiProperty({
    example: ['login', 'urgent'],
    description: 'Tags associated with the ticket',
    required: false,
  })
  @Column({ type: 'jsonb', nullable: true })
  tags!: string[] | null;

  @ApiProperty({
    example: { browser: 'chrome', os: 'macos' },
    description: 'Arbitrary metadata stored for the ticket',
    required: false,
  })
  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @ApiProperty({
    example: '2025-10-31T23:59:59.000Z',
    description: 'Optional due date for SLA or expected resolution',
    required: false,
  })
  @Column({ type: 'timestamp', nullable: true })
  due_date!: Date | null;

  @ApiProperty({
    example: '2025-10-20T10:00:00.000Z',
    description: 'Timestamp when ticket was resolved',
    required: false,
  })
  @Column({ type: 'timestamp', nullable: true })
  resolved_at!: Date | null;

  @ApiProperty({
    example: '2025-10-21T15:00:00.000Z',
    description: 'Timestamp when ticket was closed',
    required: false,
  })
  @Column({ type: 'timestamp', nullable: true })
  closed_at!: Date | null;

  @ApiProperty({
    example: '2025-10-17T12:00:00.000Z',
    description: 'Creation timestamp',
  })
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  @ApiProperty({
    example: '2025-10-17T12:05:00.000Z',
    description: 'Last update timestamp',
  })
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at!: Date;

  // Relations
  @OneToMany(() => TicketHistory, (history) => history.ticket)
  history!: TicketHistory[];
}
