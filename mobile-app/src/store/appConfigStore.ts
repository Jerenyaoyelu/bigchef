import { create } from "zustand";
import { APP_CONFIG } from "../config/env";

type AppConfigState = {
  apiBaseUrl: string;
  userId: string;
  setApiBaseUrl: (value: string) => void;
};

export const useAppConfigStore = create<AppConfigState>((set) => ({
  apiBaseUrl: APP_CONFIG.apiBaseUrl,
  userId: APP_CONFIG.userId,
  setApiBaseUrl: (value) => {
    if (!APP_CONFIG.isDev) return;
    set({ apiBaseUrl: value.trim() });
  },
}));

