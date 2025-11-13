import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Gender, UserRole } from '../../../core/entities/users.entity';
import { OtpDeliveryMethod } from '../../../shared/utils/otp-utility.service';

export class RequestOtpDto {
  @ApiProperty({
    description: 'Số điện thoại (định dạng E.164 hoặc Việt Nam)',
    example: '0865081427',
  })
  @IsString()
  @Matches(/^(\+84|84|0)(3|5|7|8|9)[0-9]{8}$/, {
    message: 'phone_number must be a valid Vietnamese phone number',
  })
  phone_number!: string;

  @ApiProperty({
    description: 'Phương thức gửi OTP',
    enum: OtpDeliveryMethod,
    default: OtpDeliveryMethod.SMS,
    required: false,
  })
  @IsOptional()
  @IsEnum(OtpDeliveryMethod)
  method?: OtpDeliveryMethod;
}

export class LoginOtpDto {
  @ApiProperty({
    description: 'Số điện thoại (định dạng E.164 hoặc Việt Nam)',
    example: '0865081427',
  })
  @IsString()
  @Matches(/^(\+84|84|0)(3|5|7|8|9)[0-9]{8}$/, {
    message: 'phone_number must be a valid Vietnamese phone number',
  })
  phone_number!: string;

  @ApiProperty({
    description: 'Mã OTP nhận được',
    example: '123456',
  })
  @IsString()
  @Matches(/^[0-9]{6}$/, {
    message: 'otp_code must be exactly 6 digits',
  })
  otp_code!: string;
}

export class AdminLoginDto {
  @ApiProperty({ description: 'Admin email', example: 'admin@healthcare.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'Password', example: 'password' })
  @IsString()
  @MinLength(6)
  password!: string;
}

export class CreateUserDto {
  @ApiProperty({
    description: 'Số điện thoại (định dạng E.164 hoặc Việt Nam)',
    example: '84369744023',
  })
  @IsString()
  @Matches(/^(\+84|84|0)(3|5|7|8|9)[0-9]{8}$/, {
    message: 'phone_number must be a valid Vietnamese phone number',
  })
  phone_number!: string;

  @ApiProperty({
    description: 'Họ và tên đầy đủ',
    example: 'Nguyễn Văn A',
  })
  @IsString()
  full_name!: string;

  @ApiProperty({
    description: 'Email',
    example: 'user@example.com',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    description: 'Ngày sinh (YYYY-MM-DD)',
    example: '1990-01-01',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  date_of_birth?: string;

  @ApiProperty({
    description: 'Giới tính',
    enum: Gender,
    example: Gender.MALE,
    required: false,
  })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiProperty({
    description: 'Vai trò người dùng',
    enum: UserRole,
    default: UserRole.CUSTOMER,
    required: false,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

export class CaregiverRegisterDto {
  @ApiProperty({ example: 'caregiver01' })
  @IsString()
  username!: string;

  @ApiProperty({ example: 'caregiver01@email.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Nguyen Van B' })
  @IsString()
  full_name!: string;

  @ApiProperty({ example: '0865081427' })
  @IsString()
  @Matches(/^\+?\d{9,15}$/, {
    message: 'phone_number must be E.164-like (ex: 84865081427)',
  })
  phone_number!: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(8)
  confirm_password!: string;
}

export class CaregiverLoginDto {
  @ApiProperty({ example: 'caregiver01@email.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(8)
  password!: string;
}

export class FirebaseLoginWithFcmDto {
  @ApiProperty({
    description: 'Firebase ID token từ Flutter app',
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6Ij...',
  })
  @IsString()
  id_token!: string;

  @ApiProperty({
    description: 'FCM token từ device (optional)',
    example: 'fcm_token_here',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Transform(({ value, obj }) => obj.fcm_token ?? obj.token ?? value)
  fcm_token?: string;

  @ApiProperty({
    description: 'Platform của device',
    enum: ['android', 'ios', 'web'],
    example: 'android',
    required: false,
  })
  @IsOptional()
  @IsString()
  platform?: 'android' | 'ios' | 'web';

  @ApiProperty({
    description: 'Device ID (optional)',
    example: 'device_unique_id',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Transform(({ value, obj }) => obj.device_id ?? obj.deviceId ?? value)
  @MaxLength(100)
  device_id?: string;
}

export class RegisterFcmTokenDto {
  @ApiProperty({
    description: 'FCM token từ device',
    example: 'fcm_token_from_device',
  })
  @IsString()
  @Transform(({ value, obj }) => obj.fcm_token ?? obj.token ?? value)
  fcm_token!: string;

  @ApiProperty({
    description: 'Platform của device',
    enum: ['android', 'ios', 'web'],
    example: 'android',
    required: false,
  })
  @IsOptional()
  @IsString()
  platform?: 'android' | 'ios' | 'web';

  @ApiProperty({
    description: 'Device ID (optional)',
    example: 'unique_device_id',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Transform(({ value, obj }) => obj.device_id ?? obj.deviceId ?? value)
  @MaxLength(100)
  device_id?: string;
}

export class ForgotPasswordDto {
  @ApiProperty({
    description: 'Email address to send password reset link',
    example: 'user@example.com',
  })
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Password reset token received via email',
    example: 'reset-token-123456',
  })
  @IsString()
  @MinLength(10)
  token!: string;

  @ApiProperty({
    description: 'New password',
    example: 'newSecurePassword123',
  })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character',
  })
  newPassword!: string;

  @ApiProperty({
    description: 'Confirm new password',
    example: 'newSecurePassword123',
  })
  @IsString()
  confirmPassword!: string;
}

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Current password',
    example: 'currentPassword123',
  })
  @IsString()
  currentPassword!: string;

  @ApiProperty({
    description: 'New password',
    example: 'newSecurePassword123',
  })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character',
  })
  newPassword!: string;

  @ApiProperty({
    description: 'Confirm new password',
    example: 'newSecurePassword123',
  })
  @IsString()
  confirmPassword!: string;
}

export class FirebasePhoneVerificationDto {
  @ApiProperty({
    description: 'Firebase verification ID from client',
    example: 'verification_id_from_firebase',
  })
  @IsString()
  @Transform(({ value, obj }) => obj.id_token ?? obj.verification_id ?? value)
  verification_id!: string;

  @ApiProperty({
    description: 'SMS code received from Firebase',
    example: '123456',
  })
  @IsString()
  @Matches(/^[0-9]{6}$/, {
    message: 'sms_code must be exactly 6 digits',
  })
  sms_code!: string;

  @ApiProperty({
    description: 'Phone number used for verification',
    example: '+84865081427',
  })
  @IsString()
  phone_number!: string;

  @ApiProperty({
    description: 'FCM token từ device (optional)',
    example: 'fcm_token_from_device',
    required: false,
  })
  @IsOptional()
  @IsString()
  fcm_token?: string;

  @ApiProperty({
    description: 'Platform của device',
    enum: ['android', 'ios', 'web'],
    example: 'android',
    required: false,
  })
  @IsOptional()
  @IsString()
  platform?: 'android' | 'ios' | 'web';

  @ApiProperty({
    description: 'Device ID (optional)',
    example: 'unique_device_id',
    required: false,
  })
  @IsOptional()
  @IsString()
  device_id?: string;
}
