import api from '@/lib/api';
import { normalizePhoneTo84 } from '@/lib/utils';

import type { User } from '@/types/user';

export type AdminUser = {
  user_id: string;
  username?: string;
  full_name?: string;
  email: string;
  role: string;
  phone_number?: string;
  is_first_login?: boolean;
  created_at?: string;
};

export type MeResponse = { user: User };

export function logout() {
  return api.post<void>('/auth/logout');
}

export function getMe() {
  return api.get<MeResponse>('/auth/me');
}

export function refreshToken() {
  return api.post<{ access_token: string }>('/auth/refresh');
}

// OTP-based auth flows
export type RequestOtpBody = { phone_number: string; method?: 'sms' | 'call' | 'both' };
export type RequestOtpResponse = {
  message: string;
  phone_number: string;
  method: 'sms' | 'call' | 'both';
  expires_at: string;
  expires_in: string;
};

export function resetOtp(body: { phone_number: string }) {
  const payload = { ...body, phone_number: normalizePhoneTo84(body.phone_number) };
  return api.post<{ message: string }>('/auth/reset-otp', payload);
}

export function requestOtp(body: RequestOtpBody) {
  const payload = { ...body, phone_number: normalizePhoneTo84(body.phone_number) };
  return api.post<RequestOtpResponse>('/auth/request-otp', payload);
}

export type LoginResponse = { access_token: string; user: AdminUser };

export function login(body: { phone_number: string; otp_code: string }) {
  const payload = { ...body, phone_number: normalizePhoneTo84(body.phone_number) };
  return api.post<LoginResponse>('/auth/login', payload);
}

export function adminLogin(body: { email: string; password: string }) {
  return api.post<LoginResponse>('/auth/admin/login', body);
}
