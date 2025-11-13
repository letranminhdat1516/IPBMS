import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Snapshot } from './snapshots.entity';

@Entity('snapshot_images')
@Index('idx_snapshot_images_snapshot_id', ['snapshot_id'])
@Index('idx_snapshot_images_created_at', ['created_at'])
export class SnapshotImage {
  @PrimaryGeneratedColumn('uuid')
  image_id!: string;

  @Column('uuid')
  snapshot_id!: string;

  @ManyToOne(() => Snapshot, (s) => s.images, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'snapshot_id' })
  snapshot!: Snapshot;

  @Column({ type: 'varchar', nullable: true })
  image_path?: string;

  @Column({ type: 'varchar', nullable: true })
  cloud_url?: string;

  @Column({ type: 'boolean', default: false })
  is_primary!: boolean;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;
}
