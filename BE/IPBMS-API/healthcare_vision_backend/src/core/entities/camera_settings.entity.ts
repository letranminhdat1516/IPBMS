import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('camera_settings')
export class CameraSetting {
  @PrimaryGeneratedColumn('uuid')
  setting_id!: string;

  @Column({ type: 'uuid', nullable: true })
  camera_id?: string;

  @Column({ type: 'varchar', nullable: true })
  setting_name?: string;

  @Column({ type: 'text', nullable: true })
  setting_value?: string;

  @Column({ type: 'varchar', nullable: true, default: 'string' })
  data_type?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at!: Date;
}
