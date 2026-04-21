const envApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

export const APP_CONFIG = {
  apiBaseUrl: envApiBaseUrl?.trim() || "http://127.0.0.1:8000",
  isDev: __DEV__,
};

