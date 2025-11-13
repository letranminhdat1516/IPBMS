export type FcmTokenType = 'device' | 'caregiver' | 'emergency' | 'customer';

export interface FcmTokenTopics {
  audience?: string;
  audiences?: string[];
  [key: string]: unknown;
}

export interface FcmToken {
  id: string;
  user_id: string;
  device_id?: string | null;
  token: string;
  platform: string;
  app_version?: string | null;
  device_model?: string | null;
  os_version?: string | null;
  topics: string | FcmTokenTopics;
  is_active: boolean;
  last_used_at?: string | null;
  revoked_at?: string | null;
  created_at: string;
  updated_at: string;
  // Legacy fields for backward compatibility
  userId?: string;
  type?: FcmTokenType;
  createdAt?: string;
  active?: boolean;
}

export interface FcmTokenListResponse {
  data: FcmToken[];
  total: number;
  page: number;
  limit: number;
}

export interface FcmTokenStatsResponse {
  typeStats: { type: FcmTokenType; count: number }[];
  userStats: { userId: string; count: number }[];
}
