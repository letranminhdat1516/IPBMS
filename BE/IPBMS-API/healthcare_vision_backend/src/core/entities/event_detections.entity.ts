import { Column, Entity, PrimaryGeneratedColumn, Index } from 'typeorm';

export enum EventTypeEnum {
  fall = 'fall',
  abnormal_behavior = 'abnormal_behavior',
  emergency = 'emergency',
  normal_activity = 'normal_activity',
  sleep = 'sleep',
}

export enum EventStatusEnum {
  danger = 'danger',
  warning = 'warning',
  normal = 'normal',
}

export enum ConfirmationStateEnum {
  DETECTED = 'DETECTED',
  CAREGIVER_UPDATED = 'CAREGIVER_UPDATED',
  CONFIRMED_BY_CUSTOMER = 'CONFIRMED_BY_CUSTOMER',
  REJECTED_BY_CUSTOMER = 'REJECTED_BY_CUSTOMER',
  AUTO_APPROVED = 'AUTO_APPROVED',
}

@Entity('events')
@Index('idx_events_user_date', ['user_id', 'detected_at'])
@Index('idx_ed_camera', ['camera_id'])
@Index('idx_ed_conf', ['confidence_score'])
@Index('idx_ed_reliab', ['reliability_score'])
@Index('idx_ed_detected', ['detected_at'])
@Index('idx_ed_room', ['room_id'])
@Index('idx_ed_snapshot', ['snapshot_id'])
@Index('idx_ed_type', ['event_type'])
@Index('idx_ed_user', ['user_id'])
@Index('idx_ed_verified_by', ['verified_by'])
@Index('idx_ed_ack_at', ['acknowledged_at'])
@Index('idx_ed_dismissed_at', ['dismissed_at'])
export class Event {
  @PrimaryGeneratedColumn('uuid', { name: 'event_id' })
  event_id!: string;

  @Column('uuid', { name: 'snapshot_id' })
  snapshot_id!: string;

  @Column('uuid', { name: 'user_id' })
  user_id!: string;

  @Column('uuid', { name: 'camera_id' })
  camera_id!: string;

  @Column('uuid', { name: 'room_id' })
  room_id!: string;

  @Column({
    name: 'event_type',
    type: 'enum',
    enum: EventTypeEnum,
    enumName: 'event_type_enum',
  })
  event_type!: EventTypeEnum;

  @Column({ name: 'event_description', type: 'text', nullable: true })
  event_description!: string | null;

  @Column({ name: 'detection_data', type: 'jsonb', nullable: true })
  detection_data!: unknown;

  @Column({ name: 'ai_analysis_result', type: 'jsonb', nullable: true })
  ai_analysis_result!: unknown;

  @Column({
    name: 'confidence_score',
    type: 'numeric',
    precision: 5,
    scale: 2,
    nullable: true,
    default: () => '0.00',
  })
  confidence_score!: string | null;

  @Column({
    name: 'reliability_score',
    type: 'numeric',
    precision: 5,
    scale: 2,
    nullable: true,
    default: () => '0.00',
  })
  reliability_score!: string | null;

  @Column({ name: 'bounding_boxes', type: 'jsonb', nullable: true })
  bounding_boxes!: unknown;

  @Column({ name: 'context_data', type: 'jsonb', nullable: true })
  context_data!: unknown;

  @Column({ name: 'detected_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  detected_at!: Date;

  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verified_at!: Date | null;

  @Column('uuid', { name: 'verified_by', nullable: true })
  verified_by!: string | null;

  @Column({ name: 'acknowledged_at', type: 'timestamptz', nullable: true })
  acknowledged_at!: Date | null;

  @Column('uuid', { name: 'acknowledged_by', nullable: true })
  acknowledged_by!: string | null;

  @Column({ name: 'dismissed_at', type: 'timestamptz', nullable: true })
  dismissed_at!: Date | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  @Column({ name: 'confirm_status', type: 'boolean', nullable: true })
  confirm_status!: boolean | null;

  @Column({
    name: 'proposed_status',
    type: 'enum',
    enum: EventStatusEnum,
    enumName: 'event_status_enum',
    nullable: true,
  })
  proposed_status!: EventStatusEnum | null;

  @Column({ name: 'pending_until', type: 'timestamptz', nullable: true })
  pending_until!: Date | null;

  @Column('uuid', { name: 'proposed_by', nullable: true })
  proposed_by!: string | null;

  @Column({
    name: 'confirmation_state',
    type: 'enum',
    enum: ConfirmationStateEnum,
    enumName: 'confirmation_state_enum',
    default: () => "'DETECTED'",
  })
  confirmation_state!: ConfirmationStateEnum;

  @Column({ name: 'pending_reason', type: 'text', nullable: true })
  pending_reason!: string | null;

  @Column({
    name: 'previous_status',
    type: 'enum',
    enum: EventStatusEnum,
    enumName: 'event_status_enum',
    nullable: true,
  })
  previous_status!: EventStatusEnum | null;

  @Column({
    name: 'status',
    type: 'enum',
    enum: EventStatusEnum,
    enumName: 'event_status_enum',
    nullable: true,
  })
  status!: EventStatusEnum | null;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes!: string | null;
}
