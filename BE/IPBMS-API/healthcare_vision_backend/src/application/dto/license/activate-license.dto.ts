import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class ActivateLicenseDto {
  @ApiProperty({ example: 'LFT-2C7E1B9A4F1D8C3A' })
  @IsString()
  @Length(8, 64)
  licenseKey!: string;

  @ApiProperty({ example: 'site-001' })
  @IsString()
  @Length(1, 128)
  siteId!: string;
}
