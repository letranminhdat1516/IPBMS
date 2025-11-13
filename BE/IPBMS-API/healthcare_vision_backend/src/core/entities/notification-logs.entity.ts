import { notif_status_enum, notif_type_enum } from '@prisma/client';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Notification } from './notifications.entity';

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  BOUNCED = 'bounced',
}

export enum NotificationChannel {
  FCM = 'fcm',
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
}

@Entity('notification_logs')
@Index(['notification_id'])
@Index(['recipient_id'])
@Index(['status'])
@Index(['channel'])
@Index(['created_at'])
export class NotificationLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  notification_id!: string;

  @Column('uuid', { nullable: true })
  recipient_id!: string;

  @Column({
    type: 'enum',
    enum: notif_type_enum,
    default: notif_type_enum.push,
  })
  channel?: notif_type_enum;

  @Column({
    type: 'enum',
    enum: notif_status_enum,
    default: notif_status_enum.pending,
  })
  status?: notif_status_enum;

  @Column('text', { nullable: true })
  error_message?: string;

  @Column('jsonb', { nullable: true })
  metadata?: Record<string, any>;

  @Column('varchar', { length: 255, nullable: true })
  provider_message_id?: string;

  @Column('timestamp', { nullable: true })
  sent_at?: Date;

  @Column('timestamp', { nullable: true })
  delivered_at?: Date;

  @CreateDateColumn()
  created_at!: Date;

  @ManyToOne(() => Notification, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'notification_id' })
  notification!: Notification;
}
