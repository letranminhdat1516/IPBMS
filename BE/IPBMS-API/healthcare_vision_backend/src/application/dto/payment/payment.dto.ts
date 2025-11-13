import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsIn, IsNumber, IsObject, IsOptional, IsString, Min } from 'class-validator';
import PlanBillingType from '../../../core/types/plan-billing.types';
import { Transform } from 'class-transformer';
import { parseJsonOrUndefined } from '../../../shared/utils';

export class CreatePaymentDto {
  @ApiProperty({ example: 'basic' })
  @IsString()
  plan_code!: string;

  @ApiProperty({ example: 'Thanh toan don 123', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: '34e92ef3-1300-40d0-a0e0-72989cf30121', required: false })
  @IsOptional()
  @IsString()
  user_id?: string;

  @ApiProperty({ example: 'monthly', required: false, enum: ['monthly', 'none'] })
  @IsOptional()
  @IsString()
  @IsIn(['monthly', 'none'])
  billing_period?: 'monthly' | 'none';

  @ApiProperty({ example: 'prepaid', required: false, enum: PlanBillingType })
  @IsOptional()
  @IsEnum(PlanBillingType)
  billing_type?: PlanBillingType;
}

export class ManualPaymentDto {
  @ApiProperty({ example: '42d344e5-b5a7-4e4e-bee6-44f43e75f977' })
  @IsString()
  user_id!: string;

  @ApiProperty({ example: 149000 })
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiProperty({ example: 'Ghi chú thanh toán (admin)', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: 'pro',
    required: false,
    description: 'Nếu không có, có thể truyền trong delivery_data.plan_code',
  })
  @IsOptional()
  @IsString()
  plan_code?: string;

  @ApiProperty({ required: false, description: 'Bổ sung metadata: { plan_code: string }' })
  @IsOptional()
  @IsObject()
  @IsOptional()
  @Transform(parseJsonOrUndefined)
  delivery_data?: Record<string, any>;

  @ApiProperty({ example: 'manual', required: false })
  @IsOptional()
  @IsString()
  provider?: string;
}
