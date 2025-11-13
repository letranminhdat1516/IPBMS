import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class UpgradeResponseDto {
  @ApiProperty({ example: 'success', description: 'Status of the upgrade operation' })
  @IsString()
  status!: string;

  @ApiProperty({ example: 'Subscription upgraded successfully', description: 'Message' })
  @IsString()
  message!: string;

  @ApiProperty({ example: 10000, description: 'Prorated amount to pay (if any)' })
  @IsOptional()
  @IsNumber()
  prorationAmount?: number;

  @ApiProperty({ example: 'txn_123456', description: 'Transaction ID for the upgrade' })
  @IsOptional()
  @IsString()
  transactionId?: string;

  @ApiProperty({ example: '2024-07-01T00:00:00.000Z', description: 'New period end date' })
  @IsOptional()
  @IsString()
  newPeriodEnd?: string;
}
