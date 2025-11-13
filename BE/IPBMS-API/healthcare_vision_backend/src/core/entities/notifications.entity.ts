import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  notification_id!: string;

  @Column({ type: 'uuid', nullable: true })
  alert_id?: string;

  @Column({ type: 'uuid', nullable: true })
  user_id?: string;

  @Column({ type: 'uuid', nullable: true })
  event_id?: string;

  @Column({ type: 'varchar', nullable: true })
  notification_type?: string;

  @Column({ type: 'varchar', nullable: true })
  business_type?: string;

  @Column({ type: 'text', nullable: true })
  message?: string;

  @Column({ type: 'jsonb', nullable: true })
  delivery_data?: object;

  @Column({ type: 'varchar', nullable: true, default: 'pending' })
  status?: string;

  @Column({ type: 'timestamp', nullable: true })
  sent_at?: Date;

  @Column({ type: 'timestamp', nullable: true })
  delivered_at?: Date;

  @Column({ type: 'varchar', nullable: true })
  priority?: string;

  @Column({ type: 'timestamp', nullable: true })
  read_at?: Date;

  @Column({ type: 'int', default: 0 })
  retry_count!: number;

  @Column({ type: 'text', nullable: true })
  error_message?: string;
}
