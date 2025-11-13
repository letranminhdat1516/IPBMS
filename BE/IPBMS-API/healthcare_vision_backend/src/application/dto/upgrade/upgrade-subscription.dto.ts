import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { PaymentProvider } from '../payment/payment-provider.enum';

export class UpgradeSubscriptionDto {
  @ApiProperty({ example: 'premium_monthly', description: 'Target plan code to upgrade to' })
  @IsString()
  plan_code!: string;

  @ApiProperty({ example: 'user_id_here', description: 'User ID for the subscription' })
  @IsString()
  userId!: string;

  @ApiProperty({ example: 'credit_card', description: 'Payment method/provider' })
  @IsEnum(PaymentProvider)
  paymentProvider!: PaymentProvider;

  @ApiProperty({ example: 1, description: 'Quantity (if applicable)' })
  @IsOptional()
  @IsNumber()
  quantity?: number;

  @ApiProperty({ example: 'upgrade', description: 'Upgrade type (upgrade/downgrade)' })
  @IsOptional()
  @IsString()
  type?: string;
}
