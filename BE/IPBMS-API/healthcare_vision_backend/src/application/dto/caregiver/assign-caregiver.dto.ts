import { ApiProperty } from '@nestjs/swagger';

export class AssignCaregiverDto {
  @ApiProperty({ example: 'user_id_123', description: 'ID của user cần gán caregiver' })
  user_id!: string;
}
