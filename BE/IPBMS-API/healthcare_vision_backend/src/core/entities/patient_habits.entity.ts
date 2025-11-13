import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum HabitType {
  sleep = 'sleep',
  meal = 'meal',
  medication = 'medication',
  activity = 'activity',
  bathroom = 'bathroom',
  therapy = 'therapy',
  social = 'social',
}

export enum Frequency {
  daily = 'daily',
  weekly = 'weekly',
  custom = 'custom',
}

@Entity({ name: 'patient_habits' })
export class PatientHabit {
  @PrimaryGeneratedColumn('uuid')
  habit_id!: string;

  @Index('idx_ph_supplement')
  @Column({ type: 'uuid', nullable: true })
  supplement_id!: string;

  @Index('idx_ph_habit_type')
  @Column({ type: 'enum', enum: HabitType })
  habit_type!: HabitType;

  @Column({ type: 'varchar', length: 200 })
  habit_name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Index('idx_ph_sleep_start')
  @Column({ type: 'time', nullable: true })
  sleep_start?: string | null; // lưu "HH:mm:ss"

  @Index('idx_ph_sleep_end')
  @Column({ type: 'time', nullable: true })
  sleep_end?: string | null; // lưu "HH:mm:ss"

  @Index('idx_ph_frequency')
  @Column({ type: 'enum', enum: Frequency, default: Frequency.daily })
  frequency!: Frequency;

  // JSONB
  @Column({ type: 'jsonb', nullable: true })
  days_of_week?: string[] | null;

  // location removed for patient habits

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @Index('idx_ph_is_active')
  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
