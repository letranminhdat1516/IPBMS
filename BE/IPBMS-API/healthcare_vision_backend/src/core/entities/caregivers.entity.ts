import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { User } from './users.entity';

@Entity('caregivers')
export class Caregiver {
  @PrimaryGeneratedColumn('uuid', { name: 'caregiver_id' })
  caregiver_id!: string;

  @Column('uuid', { name: 'user_id', unique: true })
  user_id!: string;

  // (tuỳ chọn) liên kết 1-1 tới users
  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', referencedColumnName: 'user_id' })
  user?: User;
}
