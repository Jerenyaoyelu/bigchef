import { getJson, postJson } from "../../../api/http";

export type SendSmsResponse = {
  success: boolean;
  bizCode: string;
  expiresInSec: number;
  mockCode: string;
};

export type SmsLoginResponse = {
  accessToken: string;
  refreshToken: string;
  expiresInSec: number;
  user: { userId: string; phone: string; isGuest: boolean };
};

export type RefreshResponse = {
  accessToken: string;
  refreshToken: string;
  expiresInSec: number;
};

export type MeResponse = {
  userId: string;
  phone: string;
  isGuest: boolean;
};

export type GuestUpgradeResponse = {
  success: boolean;
  migrated: { favorites: number; history: number };
  deduplicated: { favorites: number; history: number };
};

export function sendSms(phone: string) {
  return postJson<SendSmsResponse>("/api/v1/auth/sms/send", { phone });
}

export function smsLogin(phone: string, code: string) {
  return postJson<SmsLoginResponse>("/api/v1/auth/sms/login", { phone, code });
}

export function refreshToken(refreshToken: string) {
  return postJson<RefreshResponse>("/api/v1/auth/refresh", { refreshToken });
}

export function getMe() {
  return getJson<MeResponse>("/api/v1/auth/me");
}

export function upgradeGuest(guestId: string) {
  return postJson<GuestUpgradeResponse>("/api/v1/auth/guest/upgrade", { guestId });
}
