import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubscriptionDto {
  @ApiProperty() name!: string;
  @ApiProperty() contractId!: string;
  @ApiProperty() startDate!: string;
  @ApiProperty() endDate!: string;
  @ApiProperty() remaining!: string;
  @ApiProperty() cameraCount!: number;
  @ApiProperty({ type: [String] }) features!: string[];
}

export class BillingItemDto {
  @ApiProperty() date!: string;
  @ApiProperty() period!: string;
  @ApiProperty() amount!: string;
  @ApiProperty() method!: string;
  @ApiProperty() status!: string;
  @ApiProperty() invoice!: string;
}

export class BillingDto {
  @ApiProperty({ type: BillingItemDto, isArray: true })
  items!: BillingItemDto[];
  @ApiProperty() pagination!: { page: number; limit: number; total: number };
}

export class ServicesResponseDto {
  @ApiPropertyOptional({ type: SubscriptionDto })
  subscription?: SubscriptionDto;
  @ApiPropertyOptional({ type: Array }) devices?: any[];
  @ApiPropertyOptional({ type: Array }) maintenance?: any[];
  @ApiPropertyOptional({ type: BillingDto }) billing?: BillingDto;
}
