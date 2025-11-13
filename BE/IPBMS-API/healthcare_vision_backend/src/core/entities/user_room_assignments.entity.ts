import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('user_room_assignments')
export class UserRoomAssignment {
  @PrimaryGeneratedColumn('uuid')
  assignment_id!: string;

  @Column({ type: 'uuid' })
  user_id!: string;

  @Column({ type: 'uuid' })
  room_id!: string;

  @Column({ type: 'varchar', nullable: true })
  bed_number?: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  assigned_at!: Date;

  @Column({ type: 'timestamp', nullable: true })
  unassigned_at?: Date;

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @Column({ type: 'uuid', nullable: true })
  assigned_by?: string;

  @Column({ type: 'text', nullable: true })
  assignment_notes?: string;
}
