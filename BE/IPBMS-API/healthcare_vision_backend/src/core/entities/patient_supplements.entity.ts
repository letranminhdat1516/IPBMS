import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('patient_supplements')
export class PatientSupplement {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  customer_id?: string | null;

  @Column({ type: 'text', nullable: true })
  name?: string | null;

  @Column({ type: 'date', nullable: true })
  dob?: string | null;

  // avatar_url removed per request
  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  @Column({
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at!: Date;
}
