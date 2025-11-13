import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, IsIn } from 'class-validator';

export class ApproveEventDto {
  @ApiProperty({
    description: "Required for caregiver path: 'approve' to accept",
    enum: ['approve'],
    example: 'approve',
  })
  @IsString()
  @IsIn(['approve'])
  action!: 'approve';

  @ApiProperty({
    description: 'Optional notes',
    required: false,
    example: 'Checked and accepted',
    maxLength: 240,
  })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  notes?: string;
}
