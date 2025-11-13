import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, Length, Matches } from 'class-validator';
import { CreateUserDto } from '../../dto/user/create-user.dto';

export class CreateCaregiverDto extends CreateUserDto {
  @ApiProperty({
    example: 'caregiver_user1',
    description: 'Tên đăng nhập cho caregiver',
  })
  @IsString()
  username!: string;

  @ApiProperty({ example: 'care1@email.com', description: 'Email caregiver' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '0865081427', description: 'Số điện thoại caregiver' })
  @IsString()
  phone_number!: string;

  @ApiProperty({ example: '123456', description: 'Mã PIN (6 số)' })
  @IsString()
  @Length(6, 6, { message: 'PIN phải đúng 6 ký tự' })
  @Matches(/^[0-9]{6}$/, { message: 'PIN chỉ được chứa 6 số' })
  pin!: string;

  @ApiProperty({ example: 'Nguyen Van B', description: 'Họ tên đầy đủ caregiver' })
  @IsString()
  full_name!: string;
}
