import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum ActivitySeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info',
}

export enum ActivityAction {
  LOGIN = 'login',
  LOGOUT = 'logout',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  ASSIGN = 'assign',
  UNASSIGN = 'unassign',
  EXPORT = 'export',
  NOTIFY = 'notify',
}

@Entity('activity_logs')
export class ActivityLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  timestamp?: Date;

  @Column({ type: 'uuid', nullable: true })
  actor_id?: string | null;

  @Column({ type: 'varchar', nullable: true })
  actor_name?: string | null;

  @Column({ type: 'varchar', nullable: true })
  action?: string | null;

  @Column({ type: 'varchar', nullable: true })
  resource_type?: string | null;

  @Column({ type: 'varchar', nullable: true })
  resource_id?: string | null;

  @Column({ type: 'varchar', nullable: true })
  resource_name?: string | null;

  @Column({ type: 'text', nullable: true })
  message?: string | null;

  @Column({
    type: 'enum',
    enum: ActivitySeverity,
    default: ActivitySeverity.INFO,
  })
  severity!: ActivitySeverity;

  @Column({
    type: 'enum',
    enum: ActivityAction,
    nullable: true,
  })
  action_enum?: ActivityAction;

  @Column({ type: 'jsonb', nullable: true, default: () => `'{}'` })
  meta?: object;

  @Column({ type: 'varchar', nullable: true })
  ip?: string;
}
