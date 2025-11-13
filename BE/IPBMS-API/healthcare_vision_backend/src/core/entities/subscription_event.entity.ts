import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('subscription_histories')
export class SubscriptionEvent {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  @Column({ name: 'subscription_id', type: 'uuid' })
  subscriptionId!: string;

  @Column({ name: 'event_type', type: 'varchar', length: 64 })
  eventType!: string;

  @Column({ name: 'event_data', type: 'jsonb', nullable: true })
  eventData?: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
