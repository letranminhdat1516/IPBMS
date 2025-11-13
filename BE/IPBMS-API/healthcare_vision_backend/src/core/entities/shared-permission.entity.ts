import { NotificationChannel } from 'src/application/utils/shared-permissions';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../entities/users.entity';

@Entity('access_grants')
export class SharedPermission {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid') customer_id!: string;
  @Column('uuid') caregiver_id!: string;

  @Column({ default: false }) stream_view?: boolean;
  @Column({ default: false }) alert_read?: boolean;
  @Column({ default: false }) alert_ack?: boolean;
  @Column({ default: false }) profile_view?: boolean;

  @Column({ type: 'int', default: 0 }) log_access_days?: number;
  @Column({ type: 'int', default: 0 }) report_access_days?: number;

  @Column({ type: 'jsonb', default: () => "'[]'" }) notification_channel?: NotificationChannel[];

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' }) created_at?: Date;
  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' }) updated_at?: Date;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'caregiver_id' })
  caregiver?: User;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'customer_id' })
  customer?: User;
}
