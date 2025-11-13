import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';
import { Plan } from './plan.entity';
import { Transaction } from './transaction.entity';

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  subscription_id!: string;

  @OneToMany(() => Transaction, (transaction) => transaction.subscription)
  transactions!: Transaction[];

  @Column('uuid')
  user_id!: string;

  @ManyToOne(() => Plan, { eager: true })
  @JoinColumn({ name: 'plan_code', referencedColumnName: 'code' })
  plan!: Plan;

  @RelationId((sub: Subscription) => sub.plan)
  planCode!: string;

  @Column({ type: 'varchar', default: 'active' })
  status!: 'trialing' | 'active' | 'past_due' | 'paused' | 'canceled';

  @Column({ type: 'varchar', default: 'none' })
  billing_period!: 'none' | 'monthly';

  @Column({ type: 'timestamptz', default: () => 'now()' })
  started_at!: Date;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  current_period_start!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  current_period_end?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  trial_end_at?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  canceled_at?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  ended_at?: Date;

  @Column({ type: 'boolean', default: false })
  auto_renew!: boolean;

  @Column({ type: 'int', default: 0 })
  extra_camera_quota!: number;

  @Column({ type: 'int', default: 0 })
  extra_caregiver_seats!: number;

  @Column({ type: 'int', default: 0 })
  extra_sites!: number;

  @Column({ type: 'int', default: 0 })
  extra_storage_gb!: number;

  @Column({ type: 'varchar', nullable: true })
  notes?: string;

  @Column({ type: 'timestamptz', nullable: true })
  last_payment_at?: Date;
}
