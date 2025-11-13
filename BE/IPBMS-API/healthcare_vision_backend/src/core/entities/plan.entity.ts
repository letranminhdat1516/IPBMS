import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';
import PlanBillingType from '../types/plan-billing.types';

@Entity('plans')
export class Plan {
  @PrimaryColumn()
  code!: string;
  @Column() name!: string;
  @Column() price!: number;
  @Column() camera_quota!: number;
  @Column() retention_days!: number;
  @Column() caregiver_seats!: number;
  @Column({ default: 1 }) sites!: number;
  @Column({ default: 24 }) major_updates_months!: number;
  @Column({ type: 'enum', enum: PlanBillingType, default: PlanBillingType.PREPAID })
  billing_type!: PlanBillingType;
  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
