import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { SnapshotImage } from './snapshot-images.entity';

@Entity('snapshots')
export class Snapshot {
  @PrimaryGeneratedColumn('uuid')
  snapshot_id!: string;

  @Column({ type: 'uuid', nullable: true })
  camera_id?: string;

  @Column({ type: 'uuid', nullable: true })
  room_id?: string;

  @Column({ type: 'uuid', nullable: true })
  user_id?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: object;

  @Column({ type: 'varchar', nullable: true, default: 'scheduled' })
  capture_type?: string;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  captured_at!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  processed_at?: Date;

  @Column({ type: 'boolean', default: false })
  is_processed!: boolean;

  @OneToMany(() => SnapshotImage, (img) => img.snapshot, { cascade: true })
  images!: SnapshotImage[];
}
