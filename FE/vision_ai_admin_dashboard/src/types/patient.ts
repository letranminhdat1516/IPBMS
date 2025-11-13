import z from 'zod';

export interface Patient {
  patient_id: number;
  user_id: number;
  medical_record_number: string;
  current_status: string;
}

export const PatientSchema = z.object({
  patient_id: z.number(),
  user_id: z.number(),
  medical_record_number: z.string(),
  current_status: z.string(),
});
