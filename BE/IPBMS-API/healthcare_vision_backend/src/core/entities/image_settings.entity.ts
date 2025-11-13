import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('image_settings')
@Index(['user_id', 'key'], { unique: true })
export class ImageSetting {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  @Column({ name: 'user_id', type: 'char', length: 36 })
  user_id!: string;

  @Column({ name: 'key', type: 'varchar', length: 100 })
  key!: string;

  @Column({ name: 'value', type: 'text', nullable: true })
  value!: string | null;

  @Column({ name: 'is_enabled', type: 'boolean', default: true })
  is_enabled!: boolean;

  @Column({ name: 'is_overridden', type: 'boolean', default: false })
  is_overridden!: boolean;

  @Column({ name: 'overridden_at', type: 'timestamptz', nullable: true })
  overridden_at?: Date | null;
}
