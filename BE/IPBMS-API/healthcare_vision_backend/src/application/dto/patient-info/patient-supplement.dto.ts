export class SupplementCreateDto {
  name?: string;
  dob?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  call_confirmed_until?: string | null;
}

export class SupplementUpdateDto {
  name?: string | null;
  dob?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  call_confirmed_until?: string | null;
}

export class SupplementResponseDto {
  id?: string;
  name?: string | null;
  dob?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  customer_id?: string | null;
  created_at?: string;
  updated_at?: string;
}
