import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './users.entity';

@Entity('fall_detection_settings')
export class FallDetectionSetting {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  user_id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'int', default: 5 })
  abnormal_unconfirmed_streak!: number;

  @Column({ type: 'int', default: 30 })
  abnormal_streak_window_minutes!: number;

  @Column({ type: 'boolean', default: true })
  only_trigger_if_unconfirmed!: boolean;

  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at!: Date;
}
