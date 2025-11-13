import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { Exclude } from 'class-transformer';

// Enums for better type safety
export enum UserRole {
  CUSTOMER = 'customer',
  CAREGIVER = 'caregiver',
  ADMIN = 'admin',
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid', { name: 'user_id' })
  user_id!: string;

  @Column({ unique: true, length: 50 })
  username!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  email!: string; // Required in DB

  @Exclude({ toPlainOnly: true })
  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  password_hash!: string;

  @Column({ name: 'full_name', type: 'varchar', length: 100 })
  full_name!: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.CUSTOMER,
  })
  role!: UserRole;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  date_of_birth?: string;

  @Column({ type: 'enum', enum: Gender, nullable: true })
  gender?: Gender;

  @Column({
    name: 'phone_number',
    type: 'varchar',
    length: 20,
    nullable: true,
    unique: true,
  })
  phone_number?: string;

  @Column({ name: 'otp_code', type: 'text', nullable: true })
  otp_code?: string;

  @Column({ name: 'otp_expires_at', type: 'date', nullable: true })
  otp_expires_at?: Date;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  is_active!: boolean;

  @Column({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  created_at!: Date;

  @Column({
    name: 'updated_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at!: Date;
}
