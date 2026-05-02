import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

function createGuestId(): string {
  try {
    const c = globalThis.crypto as Crypto | undefined;
    if (c?.randomUUID) return `guest_${c.randomUUID()}`;
  } catch {
    /* ignore */
  }
  return `guest_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 14)}`;
}

type SessionState = {
  /** 首次打开 App 生成并持久化，全生命周期稳定 */
  guestId: string | null;
  /** 登录成功后由服务端或本地登录流程写入；退出登录置 null */
  authUserId: string | null;
  /** Bearer access token */
  accessToken: string | null;
  /** Bearer refresh token */
  refreshToken: string | null;
  ensureGuestId: () => string;
  setAuthUserId: (userId: string | null) => void;
  setTokens: (accessToken: string | null, refreshToken: string | null) => void;
  /** 请求头使用的用户标识：已登录优先，否则游客 */
  getEffectiveUserId: () => string;
  logout: () => void;
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      guestId: null,
      authUserId: null,
      accessToken: null,
      refreshToken: null,
      ensureGuestId: () => {
        const existing = get().guestId;
        if (existing) return existing;
        const id = createGuestId();
        set({ guestId: id });
        return id;
      },
      setAuthUserId: (userId) => set({ authUserId: userId }),
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      getEffectiveUserId: () => {
        const { authUserId, guestId } = get();
        if (authUserId) return authUserId;
        if (guestId) return guestId;
        return get().ensureGuestId();
      },
      logout: () =>
        set({
          authUserId: null,
          accessToken: null,
          refreshToken: null,
        }),
    }),
    {
      name: "bigchef-session",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        guestId: s.guestId,
        authUserId: s.authUserId,
        accessToken: s.accessToken,
        refreshToken: s.refreshToken,
      }),
    },
  ),
);
