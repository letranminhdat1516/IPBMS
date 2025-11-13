import { z } from 'zod';

// Legacy UI status type kept for compatibility across the app
export type UserStatus = 'active' | 'inactive' | 'invited' | 'suspended';

// Build a schema that accepts backend fields and legacy UI fields, then normalize
const BaseUserSchema = z
  .object({
    // backend fields from actual API
    user_id: z.union([z.string().min(1), z.number()]),
    username: z.string(),
    email: z.string().email(),
    full_name: z.string().optional(),
    type: z.string().optional(), // API uses 'type' instead of 'role'
    joined: z.string().optional(), // API uses 'joined' instead of 'created_at'
    is_active: z.boolean().optional(),
    plan_name: z.string().optional(),
    plan_code: z.string().optional(),
    camera_quota: z.number().optional(),
    camera_quota_used: z.number().optional(),
    alerts_total: z.number().optional(),
    alerts_unresolved: z.number().optional(),
    payments_total: z.number().optional(),
    payments_pending: z.number().optional(),
    subscription_status: z.string().optional(),
    summary: z
      .object({
        service_tier: z.string().optional(),
        latest_payment_status: z.string().optional(),
        cameras_total: z.number().optional(),
        cameras_active: z.number().optional(),
        alerts_today: z.number().optional(),
        plan_name: z.string().optional(),
        plan_code: z.string().optional(),
        camera_quota: z.number().optional(),
        camera_quota_used: z.number().optional(),
        alerts_total: z.number().optional(),
        alerts_unresolved: z.number().optional(),
        payments_total: z.number().optional(),
        payments_pending: z.number().optional(),
        subscription_status: z.string().optional(),
      })
      .optional(),
    // legacy backend fields (for compatibility)
    role: z.string().optional(),
    created_at: z.string().optional(),
    password_hash: z.string().optional(),
    date_of_birth: z.string().nullable().optional(),
    gender: z.enum(['male', 'female', 'other']).nullable().optional(),
    phone_number: z.string().nullable().optional(),
    otp_code: z.string().nullable().optional(),
    otp_expires_at: z.string().nullable().optional(),
    emergency_contact: z.unknown().nullable().optional(),
    medical_conditions: z.unknown().nullable().optional(),
    mobility_limitations: z.unknown().nullable().optional(),
    updated_at: z.string().optional(),
    // legacy UI fields (optional)
    status: z.enum(['active', 'inactive', 'invited', 'suspended']).optional(),
    phone: z.string().optional(),
    avatar: z.string().optional(),
    age: z.number().optional(),
    address: z.string().optional(),
    service: z.string().optional(),
    camera: z.string().optional(),
    alerts: z.string().optional(),
    payment: z.string().optional(),
    code: z.string().optional(),
  })
  .passthrough();

export const UserSchema = BaseUserSchema.transform((u) => {
  const status: UserStatus = u.status
    ? u.status
    : typeof u.is_active === 'boolean'
      ? u.is_active
        ? 'active'
        : 'inactive'
      : 'active';
  const phone = u.phone ?? u.phone_number ?? undefined;
  const full_name = u.full_name ?? u.username;
  const role = u.role ?? u.type; // Map 'type' to 'role' for compatibility
  const created_at = u.created_at ?? u.joined; // Map 'joined' to 'created_at' for compatibility
  return {
    ...u,
    status,
    phone,
    full_name,
    role: role || undefined,
    created_at: created_at || undefined,
  };
});

export type User = z.infer<typeof UserSchema>;

export const UserListSchema = z.array(UserSchema);

export type PatientSupplement = {
  patient?: { id: string; name: string; dob: string | null } | null;
  record?: { conditions: string[]; medications: string[]; history: string[] } | null;
};

// Caregiver types
export type CaregiverStatus = 'pending' | 'approved' | 'rejected';
export const CaregiverStatusEnum = z.enum(['pending', 'approved', 'rejected']);

export type Caregiver = {
  user_id: string | number;
  username: string;
  email: string;
  full_name: string;
  role?: string;
  date_of_birth?: string | null;
  gender?: 'male' | 'female' | 'other' | null;
  phone_number?: string | null;
  phone?: string;
  avatar?: string;
  address?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  status: CaregiverStatus;
  registered_at: string;
  verified?: boolean;
};

export const CaregiverSchema = BaseUserSchema.extend({
  user_id: z.union([z.string().min(1), z.number()]),
  status: CaregiverStatusEnum,
  registered_at: z.string(),
  verified: z.boolean().optional(),
}).transform((u) => {
  // Map legacy and backend fields to Caregiver
  const status: CaregiverStatus = u.status
    ? u.status
    : typeof u.is_active === 'boolean'
      ? u.is_active
        ? 'approved'
        : 'pending'
      : 'pending';
  const phone = u.phone ?? u.phone_number ?? undefined;
  const full_name = u.full_name ?? u.username;
  return {
    ...u,
    status,
    phone,
    full_name,
  };
});

// Accept backend user-shaped objects and transform to Caregiver
const CaregiverFromUserSchema = z
  .object({
    user_id: z.union([z.string().min(1), z.number()]),
    username: z.string().optional(),
    full_name: z.string().optional(),
    email: z.string().email(),
    phone_number: z.string().nullable().optional(),
    avatar: z.string().optional(),
    address: z.string().optional(),
    is_active: z.boolean().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    status: z.enum(['pending', 'approved', 'rejected']).optional(),
    role: z.string().optional(),
    date_of_birth: z.string().nullable().optional(),
    gender: z.enum(['male', 'female', 'other']).nullable().optional(),
    verified: z.boolean().optional(),
  })
  .transform((u): Caregiver => {
    const full_name = u.full_name ?? u.username ?? 'Chưa đặt tên';
    const status: CaregiverStatus = u.status ? u.status : u.is_active ? 'approved' : 'pending';
    const registered_at = u.created_at ?? u.updated_at ?? new Date().toISOString();
    return {
      user_id: u.user_id,
      username: u.username ?? '',
      email: u.email,
      full_name,
      role: u.role,
      date_of_birth: u.date_of_birth,
      gender: u.gender,
      phone_number: u.phone_number,
      phone: u.phone_number ?? '',
      avatar: u.avatar,
      address: u.address,
      is_active: u.is_active,
      created_at: u.created_at,
      updated_at: u.updated_at,
      status,
      registered_at,
      verified: u.verified,
    };
  });

export const CaregiverAnySchema = z.union([CaregiverSchema, CaregiverFromUserSchema]);
export const CaregiverListSchema = z.array(CaregiverSchema);
export const CaregiverAnyListSchema = z.array(CaregiverAnySchema);
