import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsDate, IsBoolean, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateUserRoomAssignmentDto {
  @ApiProperty({ example: 'uuid-user', description: 'User ID' })
  @IsString()
  user_id!: string;

  @ApiProperty({ example: 'uuid-room', description: 'Room ID' })
  @IsString()
  room_id!: string;

  @ApiProperty({ example: 'A1', description: 'Bed number' })
  @IsOptional()
  @IsString()
  bed_number?: string;

  @ApiProperty({ example: '2024-06-01T12:00:00Z', description: 'Assigned at' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  assigned_at?: Date;

  @ApiProperty({ example: '2024-06-02T12:00:00Z', description: 'Unassigned at' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  unassigned_at?: Date;

  @ApiProperty({ example: true, description: 'Is active' })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiProperty({ example: 'uuid-admin', description: 'Assigned by' })
  @IsOptional()
  @IsString()
  assigned_by?: string;

  @ApiProperty({ example: 'Note', description: 'Assignment note' })
  @IsOptional()
  @IsString()
  assignment_notes?: string;
}
