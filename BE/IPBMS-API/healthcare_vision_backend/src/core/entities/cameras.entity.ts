import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './users.entity';
import { CameraSetting } from './camera_settings.entity';

export enum CameraType {
  ip = 'ip',
  usb = 'usb',
  rtsp = 'rtsp',
}

export enum CameraStatus {
  active = 'active',
  inactive = 'inactive',
  error = 'error',
}

@Entity('cameras')
export class Camera {
  @PrimaryGeneratedColumn('uuid')
  camera_id!: string;

  @Column('uuid')
  @Index('idx_cameras_user')
  user_id!: string;

  @Column('varchar', { length: 100 })
  camera_name!: string;

  @Column({
    type: 'enum',
    enum: CameraType,
    default: CameraType.ip,
  })
  @Index('idx_cameras_type')
  camera_type!: CameraType;

  @Column('varchar', { length: 45, nullable: true, unique: true })
  ip_address?: string;

  @Column('int', { nullable: true, default: 80 })
  port?: number;

  @Column('varchar', { length: 255, nullable: true })
  rtsp_url?: string;

  @Column('varchar', { length: 50, nullable: true })
  username?: string;

  @Column('varchar', { length: 100, nullable: true })
  password?: string;

  @Column('varchar', { length: 50, nullable: true })
  location_in_room?: string;

  @Column('varchar', { length: 20, nullable: true, default: '1920x1080' })
  resolution?: string;

  @Column('int', { nullable: true, default: 30 })
  fps?: number;

  @Column({
    type: 'enum',
    enum: CameraStatus,
    default: CameraStatus.active,
  })
  @Index('idx_cameras_status')
  status!: CameraStatus;

  @Column('timestamptz', { nullable: true })
  @Index('idx_cameras_last_ping')
  last_ping?: Date;

  @Column('boolean', { default: true })
  is_online!: boolean;

  @Column('timestamptz', { nullable: true })
  last_heartbeat_at?: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  // TODO: Add relations to Event, Snapshot, CameraSetting when they are properly defined
  // @OneToMany(() => Event, (event) => event.camera)
  // events!: Event[];

  // @OneToMany(() => Snapshot, (snapshot) => snapshot.camera)
  // snapshots!: Snapshot[];

  // @OneToMany(() => CameraSetting, (setting) => setting.camera)
  // camera_settings!: CameraSetting[];
}
