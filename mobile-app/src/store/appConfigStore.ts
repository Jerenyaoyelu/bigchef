import { create } from "zustand";
import { APP_CONFIG } from "../config/env";

type AppConfigState = {
  apiBaseUrl: string;
  setApiBaseUrl: (value: string) => void;
};

export const useAppConfigStore = create<AppConfigState>((set) => ({
  apiBaseUrl: APP_CONFIG.apiBaseUrl,
  setApiBaseUrl: (value) => {
    if (!APP_CONFIG.isDev) return;
    set({ apiBaseUrl: value.trim() });
  },
}));
