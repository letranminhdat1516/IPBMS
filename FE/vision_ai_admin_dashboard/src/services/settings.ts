import api from '@/lib/api';

export type Profile = {
  username: string;
  email: string;
  bio?: string;
  urls?: Array<{ value: string }>;
};
export type Account = { name: string; dob: string; language: string };
export type Appearance = { theme: 'light' | 'dark'; font: string };
export type NotificationsPref = {
  type: 'all' | 'mentions' | 'none';
  mobile?: boolean;
  communication_emails?: boolean;
  social_emails?: boolean;
  marketing_emails?: boolean;
  security_emails: boolean;
};
export type DisplayPref = { items: string[] };

export function getMyProfile() {
  return api.get<Profile>('/me/profile');
}
export function updateMyProfile(body: Partial<Profile>) {
  return api.put<Profile>('/me/profile', body);
}

export function getMyAccount() {
  return api.get<Account>('/me/account');
}
export function updateMyAccount(body: Partial<Account>) {
  return api.put<Account>('/me/account', body);
}

export function getMyAppearance() {
  return api.get<Appearance>('/me/preferences/appearance');
}
export function updateMyAppearance(body: Partial<Appearance>) {
  return api.put<Appearance>('/me/preferences/appearance', body);
}

export function getMyNotificationsPref() {
  return api.get<NotificationsPref>('/me/preferences/notifications');
}
export function updateMyNotificationsPref(body: Partial<NotificationsPref>) {
  return api.put<NotificationsPref>('/me/preferences/notifications', body);
}

export function getMyDisplayPref() {
  return api.get<DisplayPref>('/me/preferences/display');
}
export function updateMyDisplayPref(body: Partial<DisplayPref>) {
  return api.put<DisplayPref>('/me/preferences/display', body);
}
