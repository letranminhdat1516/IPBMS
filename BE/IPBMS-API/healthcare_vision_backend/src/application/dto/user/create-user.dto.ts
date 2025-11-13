import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Length, Matches } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'user1', description: 'Tên đăng nhập' })
  @IsString()
  username!: string;

  @ApiProperty({ example: 'user1@email.com', description: 'Email' })
  @IsString()
  email!: string;

  @ApiProperty({
    example: '0865081427',
    description: 'Số điện thoại (định dạng Việt Nam, tuỳ chọn)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^(\+84|84|0)(3|5|7|8|9)[0-9]{8}$/i, {
    message: 'Số điện thoại (định dạng Việt Nam)',
  })
  phone_number?: string;

  @ApiProperty({ example: 'Nguyen Van A', description: 'Họ tên đầy đủ' })
  @IsString()
  full_name!: string;
}
