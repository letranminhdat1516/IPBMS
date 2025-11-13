import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('ai_processing_logs')
export class AiProcessingLog {
  @PrimaryGeneratedColumn('uuid')
  log_id!: string;

  @Column({ type: 'uuid', nullable: true })
  snapshot_id?: string;

  @Column({ type: 'uuid', nullable: true })
  user_id?: string;

  @Column({ type: 'varchar', nullable: true })
  processing_stage?: string;

  @Column({ type: 'jsonb', nullable: true })
  input_data?: object;

  @Column({ type: 'jsonb', nullable: true })
  output_data?: object;

  @Column({ type: 'int', default: 0 })
  processing_time_ms!: number;

  @Column({ type: 'varchar', nullable: true })
  result_status?: string;

  @Column({ type: 'text', nullable: true })
  error_message?: string;

  @Column({ type: 'varchar', nullable: true })
  model_version?: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  processed_at!: Date;
}
