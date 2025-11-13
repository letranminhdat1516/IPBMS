import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';
import { ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../entities/users.entity';

@Entity('caregiver_invitations')
export class CaregiverAssignment {
  @PrimaryGeneratedColumn('uuid', { name: 'assignment_id' })
  assignment_id!: string;

  @Column({ type: 'uuid', name: 'caregiver_id' })
  caregiver_id!: string;

  @Column({ type: 'uuid', name: 'customer_id' })
  customer_id!: string;

  @Column({ type: 'uuid', name: 'assigned_by', nullable: true })
  assigned_by?: string | null;

  @Column({ type: 'text', name: 'assignment_notes', nullable: true })
  assignment_notes?: string | null;

  /**
   * JSON column storing granular permissions the customer shares with the caregiver.
   * Example shape:
   * {
   *   "stream:view": true,
   *   "alert:read": true,
   *   "alert:ack": false,
   *   "log_access_days": 7,
   *   "report_access_days": 30,
   *   "notification_channel": ["push","sms"],
   *   "profile:view": true
   * }
   */

  @Column({ type: 'timestamptz', name: 'assigned_at', default: () => 'CURRENT_TIMESTAMP' })
  assigned_at!: Date;

  @Column({ type: 'timestamptz', name: 'unassigned_at', nullable: true })
  unassigned_at?: Date | null;

  @Index('idx_cpa_is_active')
  @Column({ type: 'boolean', name: 'is_active', default: true })
  is_active!: boolean;

  @Column({ type: 'varchar', name: 'status', default: 'pending' })
  status!: 'pending' | 'accepted' | 'rejected';

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'caregiver_id' })
  caregiver?: User;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'customer_id' })
  customer?: User;
}
