import { IsString, Matches, Length } from 'class-validator';

export class LoginOtpDto {
  @IsString()
  @Matches(/^\+?\d{9,15}$/, { message: 'phone_number must be E.164-like' })
  phone_number!: string;

  @IsString()
  @Length(4, 10)
  otp_code!: string;
}
