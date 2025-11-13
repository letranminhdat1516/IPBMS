import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateDoctorDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  specialty?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1024)
  notes?: string;
}
