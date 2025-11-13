// src/core/entities/emergency_contacts.entity.ts
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum AlertLevel {
  ALL = 1,
  ABNORMAL = 2,
  DANGER = 3,
}

@Entity('emergency_contacts')
export class EmergencyContact {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  supplement_id?: string | null;

  @Column({ type: 'text' })
  name!: string;

  @Column({ type: 'text' })
  relation!: string;

  @Column({ type: 'text' })
  phone!: string;

  // NEW: cấp độ cảnh báo 1..3
  @Column({ type: 'int', default: 1 })
  alert_level!: number;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  @Column({
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at!: Date;
}
