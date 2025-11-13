import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('patient_medical_histories')
@Unique(['supplement_id'])
export class PatientMedicalRecord {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  supplement_id!: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  name!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  history!: string[];

  @Column({
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at!: Date;
}
