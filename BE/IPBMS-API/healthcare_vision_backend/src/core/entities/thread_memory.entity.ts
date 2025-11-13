import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('thread_memory')
export class ThreadMemory {
  @PrimaryGeneratedColumn('uuid')
  thread_id!: string;

  @Column({ type: 'uuid' })
  user_id!: string;

  @Column({ type: 'jsonb', nullable: true })
  conversation_history?: object;

  @Column({ type: 'jsonb', nullable: true })
  context_cache?: object;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  last_updated!: Date;

  @Column({ type: 'timestamp', nullable: true })
  expires_at?: Date;

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;
}
