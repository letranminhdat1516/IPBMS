import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum PushPlatformEnum {
  android = 'android',
  ios = 'ios',
  web = 'web',
}

@Index('unique_fcm_user_device', ['user_id', 'device_id'], { unique: true })
@Index('idx_fcm_user', ['user_id'])
@Index('idx_fcm_platform', ['platform'])
@Index('idx_fcm_active', ['is_active'])
@Index('idx_fcm_last_used', ['last_used_at'])
@Entity('device_tokens')
export class FcmToken {
  // PK trong DB là token_id (uuid)
  @PrimaryGeneratedColumn('uuid', { name: 'token_id' })
  id?: string;

  @Column('uuid', { name: 'user_id' })
  user_id!: string;

  @Column('varchar', { name: 'device_id', length: 100, nullable: true })
  device_id!: string | null;

  @Column('text', { name: 'token', unique: true })
  token!: string;

  @Column({
    name: 'platform',
    type: 'enum',
    enum: PushPlatformEnum,
    enumName: 'push_platform_enum', // dùng đúng enum name trong Postgres
  })
  platform!: PushPlatformEnum;

  @Column('varchar', { name: 'app_version', length: 50, nullable: true })
  app_version!: string | null;

  @Column('varchar', { name: 'device_model', length: 100, nullable: true })
  device_model!: string | null;

  @Column('varchar', { name: 'os_version', length: 50, nullable: true })
  os_version!: string | null;

  @Column('jsonb', { name: 'topics', nullable: true })
  topics!: Record<string, any> | null;

  @Column('boolean', { name: 'is_active', default: () => 'true' })
  is_active!: boolean;

  @Column('timestamptz', { name: 'last_used_at', nullable: true })
  last_used_at!: Date | null;

  @Column('timestamptz', { name: 'revoked_at', nullable: true })
  revoked_at!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at!: Date;

  // Nếu có quan hệ tới bảng users:
  // @ManyToOne(() => User, (u) => u.device_tokens, { onDelete: 'CASCADE' })
  // @JoinColumn({ name: 'user_id', referencedColumnName: 'user_id' })
  // user?: User;
}
