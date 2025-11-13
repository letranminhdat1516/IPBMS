import z from 'zod';

export interface PatientBehaviorBaseline {
  baseline_id: number;
  patient_id: number;
  behavior_patterns: string;
}

export const PatientBehaviorBaselineSchema = z.object({
  baseline_id: z.number(),
  patient_id: z.number(),
  behavior_patterns: z.string(),
});
