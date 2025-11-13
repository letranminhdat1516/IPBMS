import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsDate, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateUserRoomAssignmentDto {
  @ApiProperty({ example: 'uuid-user', description: 'User ID', required: false })
  @IsOptional()
  @IsString()
  user_id?: string;

  @ApiProperty({ example: 'uuid-room', description: 'Room ID', required: false })
  @IsOptional()
  @IsString()
  room_id?: string;

  @ApiProperty({ example: 'A1', description: 'Bed number', required: false })
  @IsOptional()
  @IsString()
  bed_number?: string;

  @ApiProperty({ example: '2024-06-01T12:00:00Z', description: 'Assigned at', required: false })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  assigned_at?: Date;

  @ApiProperty({ example: '2024-06-02T12:00:00Z', description: 'Unassigned at', required: false })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  unassigned_at?: Date;

  @ApiProperty({ example: true, description: 'Is active', required: false })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiProperty({ example: 'uuid-admin', description: 'Assigned by', required: false })
  @IsOptional()
  @IsString()
  assigned_by?: string;

  @ApiProperty({ example: 'Note', description: 'Assignment note', required: false })
  @IsOptional()
  @IsString()
  assignment_notes?: string;
}
