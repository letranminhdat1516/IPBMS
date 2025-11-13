import { ApiProperty } from '@nestjs/swagger';
import { HabitType, Frequency } from '../../../core/entities/patient_habits.entity';

export class EmergencyContactDto {
  @ApiProperty() name!: string;
  @ApiProperty() relation!: string;
  @ApiProperty() phone!: string;
  @ApiProperty() alert_level!: number;
}

export class PatientDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ required: false }) dob?: string;
}

export class PatientMedicalRecordDto {
  @ApiProperty({ required: false }) name?: string;
  @ApiProperty({ required: false }) notes?: string;
  @ApiProperty({ required: false }) history?: string[];
}

export class PatientHabitDto {
  @ApiProperty() habit_id!: string;
  @ApiProperty({ enum: HabitType }) habit_type!: HabitType;
  @ApiProperty() habit_name!: string;
  @ApiProperty({ required: false }) description?: string | null;
  @ApiProperty({ required: false, example: '23:00:00' }) sleep_start?: string | null;
  @ApiProperty({ required: false, example: '07:00:00' }) sleep_end?: string | null;
  @ApiProperty({ enum: Frequency }) frequency!: Frequency;
  @ApiProperty({ required: false, type: [String] }) days_of_week?: string[] | null;
  @ApiProperty({ required: false }) notes?: string | null;
  @ApiProperty() is_active!: boolean;
  @ApiProperty() created_at!: Date;
  @ApiProperty() updated_at!: Date;
}

export class MedicalInfoResponseDto {
  @ApiProperty({ type: PatientDto }) patient!: PatientDto;
  @ApiProperty({ type: PatientMedicalRecordDto })
  record!: PatientMedicalRecordDto;
  @ApiProperty({ type: EmergencyContactDto, isArray: true })
  contacts!: EmergencyContactDto[];
  @ApiProperty({ type: PatientHabitDto, isArray: true }) habits!: PatientHabitDto[];
}

export class CreateMedicalInfoResponseDto {
  @ApiProperty({ type: PatientDto }) patient!: PatientDto;
  @ApiProperty({ type: PatientMedicalRecordDto })
  record!: PatientMedicalRecordDto;
  @ApiProperty({ type: PatientHabitDto, isArray: true }) habits!: PatientHabitDto[];
}
