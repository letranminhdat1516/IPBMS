import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('ai_configurations')
export class AiConfiguration {
  @PrimaryGeneratedColumn('uuid')
  config_id!: string;

  @Column({ type: 'uuid', nullable: true })
  user_id?: string;

  @Column({ type: 'jsonb', nullable: true })
  patient_profile_context?: object;

  @Column({ type: 'jsonb', nullable: true })
  behavior_rules?: object;

  @Column({ type: 'jsonb', nullable: true })
  model_settings?: object;

  @Column({ type: 'jsonb', nullable: true })
  detection_thresholds?: object;

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at!: Date;

  @Column({ type: 'uuid', nullable: false })
  created_by!: string;
}
