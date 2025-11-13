// src/core/entities/payment.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  payment_id!: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  user_id?: string | null;

  @Column({ name: 'plan_code', type: 'text', nullable: true })
  plan_code?: string | null;

  @Column({ type: 'int' })
  amount!: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string;

  @Column({ name: 'vnp_txn_ref', type: 'varchar', length: 64, nullable: true })
  vnpTxnRef?: string | null;

  @Column({ name: 'vnp_create_date', type: 'bigint', nullable: true })
  vnpCreateDate?: string;

  @Column({ name: 'vnp_expire_date', type: 'bigint', nullable: true })
  vnpExpireDate?: string;

  @Column({ name: 'vnp_order_info', type: 'varchar', length: 255, nullable: true })
  vnpOrderInfo?: string;

  @Column({ type: 'varchar', length: 32, default: 'pending' })
  status!: 'pending' | 'paid' | 'failed' | 'canceled';

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at!: Date;
}
