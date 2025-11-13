import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('user_preferences')
@Index(['user_id', 'category', 'setting_key'], { unique: true })
export class UserPreference {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  @Column({ name: 'user_id', type: 'char', length: 36 })
  user_id!: string;

  @Column({ name: 'category', type: 'varchar', length: 50 })
  category!: string; // image / alert / etc

  @Column({ name: 'setting_key', type: 'varchar', length: 100 })
  setting_key!: string;

  @Column({ name: 'setting_value', type: 'text', nullable: true })
  setting_value!: string | null;

  @Column({ name: 'is_enabled', type: 'boolean', default: true })
  is_enabled!: boolean;

  @Column({ name: 'is_overridden', type: 'boolean', default: false })
  is_overridden!: boolean;

  @Column({ name: 'overridden_at', type: 'timestamptz', nullable: true })
  overridden_at?: Date | null;
}
