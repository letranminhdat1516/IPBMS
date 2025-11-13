export class UpdateEventDto {
  status?: string;
  verified_by?: string | null;
  verified_at?: string | null;
  acknowledged_by?: string | null;
  acknowledged_at?: string | null;
  dismissed_at?: string | null;
  notes?: string | null;
}
