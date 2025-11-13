import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('notification_preferences')
export class NotificationPreference {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  user_id!: string;

  @Column({ type: 'boolean', default: true })
  system_events_enabled!: boolean;

  @Column({ type: 'boolean', default: true })
  actor_messages_enabled!: boolean;

  @Column({ type: 'boolean', default: true })
  push_notifications_enabled!: boolean;

  @Column({ type: 'boolean', default: true })
  email_notifications_enabled!: boolean;

  @Column({ type: 'time', nullable: true })
  quiet_hours_start!: string | null;

  @Column({ type: 'time', nullable: true })
  quiet_hours_end!: string | null;

  @Column({ type: 'boolean', default: true })
  fall_detection_enabled!: boolean;

  @Column({ type: 'boolean', default: true })
  seizure_detection_enabled!: boolean;

  @Column({ type: 'boolean', default: true })
  abnormal_behavior_enabled!: boolean;

  // Additional system notification preferences
  @Column({ type: 'boolean', default: true })
  emergency_enabled!: boolean;

  @Column({ type: 'boolean', default: true })
  device_offline_enabled!: boolean;

  @Column({ type: 'boolean', default: true })
  payment_failed_enabled!: boolean;

  @Column({ type: 'boolean', default: true })
  subscription_expiry_enabled!: boolean;

  @Column({ type: 'boolean', default: true })
  health_check_reminder_enabled!: boolean;

  @Column({ type: 'boolean', default: true })
  appointment_reminder_enabled!: boolean;

  // User notification preferences
  @Column({ type: 'boolean', default: true })
  permission_request_enabled!: boolean;

  @Column({ type: 'boolean', default: true })
  event_update_enabled!: boolean;

  @Column({ type: 'boolean', default: true })
  caregiver_invitation_enabled!: boolean;

  // Ticket notification preferences
  @Column({ type: 'boolean', default: true })
  ticket_created_enabled!: boolean;

  @Column({ type: 'boolean', default: true })
  ticket_assigned_enabled!: boolean;

  @Column({ type: 'boolean', default: true })
  ticket_status_changed_enabled!: boolean;

  @Column({ type: 'boolean', default: true })
  ticket_message_enabled!: boolean;

  @Column({ type: 'boolean', default: true })
  ticket_rated_enabled!: boolean;

  @Column({ type: 'boolean', default: true })
  ticket_closed_enabled!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
