import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateAssignmentDto {
  @ApiProperty({ format: 'uuid', description: 'ID của caregiver muốn assign' })
  @IsUUID()
  caregiver_id!: string;

  @ApiProperty({ required: false, nullable: true, type: String })
  @IsOptional()
  @IsString()
  assignment_notes?: string | null;
}

export class AssignmentResponseDto {
  @ApiProperty()
  assignment_id!: string;

  @ApiProperty()
  caregiver_id!: string;

  @ApiProperty()
  customer_id!: string;

  @ApiProperty()
  assigned_at!: Date;

  @ApiProperty({ nullable: true })
  unassigned_at?: Date | null;

  @ApiProperty()
  is_active!: boolean;

  @ApiProperty()
  status!: 'pending' | 'accepted' | 'rejected';

  @ApiProperty({ nullable: true })
  assignment_notes?: string | null;

  @ApiProperty({ nullable: true, description: 'Thông tin người đã gán (nếu có)' })
  assigned_by_info?: { user_id: string; username: string; full_name: string } | null;

  @ApiProperty({ nullable: true, description: 'Lý do/ghi chú khi caregiver phản hồi (reject)' })
  response_reason?: string | null;
}

export class CaregiverBriefDto {
  @ApiProperty()
  full_name!: string;

  @ApiProperty()
  username!: string;
}

export class CustomerBriefDto {
  @ApiProperty()
  full_name!: string;

  @ApiProperty()
  username!: string;
}

export class AssignmentWithCustomerDto {
  @ApiProperty()
  assignment_id!: string;

  @ApiProperty()
  status!: 'pending' | 'accepted' | 'rejected';

  @ApiProperty()
  assigned_at?: Date;

  @ApiProperty({ type: CustomerBriefDto })
  customer!: CustomerBriefDto;
}

export class AssignmentWithCaregiverDto {
  @ApiProperty()
  assignment_id!: string;

  @ApiProperty()
  status!: 'pending' | 'accepted' | 'rejected';

  @ApiProperty()
  assigned_at?: Date;

  @ApiProperty({ type: CaregiverBriefDto })
  caregiver!: CaregiverBriefDto;
}
