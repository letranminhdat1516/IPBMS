import z from 'zod';

export interface PatientMedicalRecord {
  record_id: number;
  patient_id: number;
  diagnosis: string;
  medications: string;
  history: string;
}

export const PatientMedicalRecordSchema = z.object({
  record_id: z.number(),
  patient_id: z.number(),
  diagnosis: z.string(),
  medications: z.string(),
  history: z.string(),
});
