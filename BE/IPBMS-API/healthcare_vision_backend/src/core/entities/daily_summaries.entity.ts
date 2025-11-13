import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('daily_summaries')
export class DailySummary {
  @PrimaryGeneratedColumn('uuid')
  summary_id!: string;

  @Column({ type: 'uuid' })
  user_id!: string;

  @Column({ type: 'date', nullable: true })
  summary_date?: Date;

  @Column({ type: 'jsonb', nullable: true })
  activity_summary?: object;

  @Column({ type: 'jsonb', nullable: true })
  habit_compliance?: object;

  @Column({ type: 'jsonb', nullable: true })
  event_summary?: object;

  @Column({ type: 'jsonb', nullable: true })
  behavior_patterns?: object;

  @Column({ type: 'int', nullable: true })
  total_snapshots?: number;

  @Column({ type: 'int', nullable: true })
  total_events?: number;

  @Column({ type: 'int', nullable: true })
  total_alerts?: number;

  @Column({ type: 'float', nullable: true })
  activity_level_score?: number;

  @Column({ type: 'float', nullable: true })
  sleep_quality_score?: number;

  @Column({ type: 'varchar', nullable: true })
  overall_status?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  generated_at!: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at!: Date;
}
