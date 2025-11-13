import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('system_config')
export class SystemSetting {
  @PrimaryGeneratedColumn('uuid', { name: 'setting_id' })
  id!: string;

  @Index({ unique: true })
  @Column({ name: 'setting_key', type: 'varchar', length: 100, unique: true })
  key!: string; // <-- alias cột `setting_key` trong DB thành property `key`

  @Column({ name: 'setting_value', type: 'text' })
  value!: string; // <-- alias cột `setting_value` trong DB thành property `value`

  @Column({ name: 'description', type: 'varchar', length: 255, nullable: true })
  description?: string | null;

  @Column({
    name: 'data_type',
    type: 'enum',
    enum: ['string', 'number', 'boolean', 'json', 'int', 'float'],
    default: 'string',
  })
  data_type!: 'string' | 'number' | 'boolean' | 'json' | 'int' | 'float';

  @Column({ name: 'category', type: 'varchar', length: 100, nullable: true })
  category?: string | null;

  @Column({ name: 'is_encrypted', type: 'boolean', default: false })
  is_encrypted!: boolean;

  @Column({
    name: 'updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at!: Date;

  @Column({ name: 'updated_by', type: 'varchar', length: 100 })
  updated_by!: string;
}
