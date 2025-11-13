export interface Plan {
  id?: string; // Added for version management
  code: string;
  name: string;
  price: string; // API returns as string
  camera_quota: number;
  retention_days: number;
  caregiver_seats: number;
  sites: number;
  major_updates_months: number;
  created_at: string;
  version?: string; // Changed from number to string to match backend
  is_active?: boolean;
  parent_code?: string; // Reference to previous version
  status?: string; // Plan status: 'available', 'draft', 'archived', etc.
  // Optional fields for UI compatibility
  updated_at?: string;
  // Computed fields for UI (derived from API fields)
  quota_camera?: number;
  quota_retention?: number;
  quota_caregiver?: number;
  quota_sites?: number;
  // Versioning fields
  is_current?: boolean;
  effective_from?: string;
  effective_to?: string;
  versions?: PlanVersion[];
}

export interface PlanVersion {
  id?: string;
  plan_code?: string;
  version: string; // Changed from number to string to match backend
  price: string;
  camera_quota: number;
  retention_days: number;
  caregiver_seats: number;
  sites: number;
  major_updates_months: number;
  is_current: boolean;
  effective_from: string;
  effective_to?: string;
  created_at: string;
  updated_at?: string;
  // Additional fields from backend response
  code?: string;
  name?: string;
  storage_size?: string;
  is_recommended?: boolean;
  tier?: number;
  currency?: string;
  status?: string;
  version_id?: string;
  changes?: unknown[];
}

export interface PlanWithVersions extends Plan {
  versions: PlanVersion[];
}
