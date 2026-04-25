const envApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
const envUserId = process.env.EXPO_PUBLIC_USER_ID;

export const APP_CONFIG = {
  apiBaseUrl: envApiBaseUrl?.trim() || "http://127.0.0.1:8000",
  userId: envUserId?.trim() || "",
  isDev: __DEV__,
};

