import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Plan } from './plan.entity';
import { Subscription } from './subscription.entity';

export type TxStatus = 'draft' | 'open' | 'paid' | 'void' | 'overdue';
export type TxAction = 'new' | 'renew' | 'upgrade' | 'downgrade' | 'adjustment';
export type TxProvider = 'vn_pay' | 'stripe' | 'manual';

@Entity('transactions')
@Index('idx_tx_agreement', ['subscription_id'])
@Index('idx_tx_status', ['status'])
@Index('idx_tx_period_start', ['period_start'])
@Index('idx_tx_period_end', ['period_end'])
export class Transaction {
  @Column('jsonb', { nullable: true }) plan_snapshot_old?: any;
  @Column('jsonb', { nullable: true }) plan_snapshot_new?: any;
  @Column('bigint', { default: 0 }) proration_charge!: string;
  @Column('bigint', { default: 0 }) proration_credit!: string;
  @Column('boolean', { default: false }) is_proration!: boolean;
  @PrimaryGeneratedColumn('uuid') tx_id!: string;

  @Column('uuid', { name: 'agreement_id' }) subscription_id!: string;
  @ManyToOne(() => Subscription, (s) => s.transactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agreement_id' })
  subscription?: Subscription;

  @Column('varchar') plan_code!: string;
  @ManyToOne(() => Plan, (p) => p.code, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'plan_code', referencedColumnName: 'code' })
  plan?: Plan;

  @Column('jsonb') plan_snapshot!: any; // quota/giá tại thời điểm mua

  @Column('bigint') amount_subtotal!: string;
  @Column('bigint', { default: 0 }) amount_discount!: string;
  @Column('bigint', { default: 0 }) amount_tax!: string;
  @Column('bigint') amount_total!: string;
  @Column('varchar', { default: 'VND' }) currency!: string;

  @Column('timestamptz') period_start!: Date;
  @Column('timestamptz') period_end!: Date;

  @Column({ type: 'varchar', name: 'effective_action' }) action!: TxAction;
  @Column({ type: 'varchar' }) status!: TxStatus;

  @Column('varchar', { nullable: true }) provider!: TxProvider | null;
  @Column('varchar', { nullable: true }) provider_payment_id!: string | null;

  @Column('uuid', { nullable: true }) payment_id?: string | null;
  @Column('varchar', { nullable: true, unique: true }) idempotency_key!: string | null;

  @Column('uuid', { nullable: true }) related_tx_id!: string | null;
  @Column('text', { nullable: true }) notes!: string | null;

  @CreateDateColumn() created_at!: Date;
  @UpdateDateColumn() updated_at!: Date;
}
