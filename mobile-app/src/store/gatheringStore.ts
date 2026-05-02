import { create } from "zustand";

import * as gatheringApi from "../features/gathering/api/gatheringApi";

export type GatheringWish = {
  id: string;
  participantLabel: string;
  dishName: string;
  createdAt: number;
};

export type GatheringDrink = {
  id: string;
  label: string;
  qtyLabel: string;
  createdAt: number;
};

function buildJoinUrl(shareToken: string): string {
  return `https://bigchef.app/gathering/${shareToken}`;
}

type GatheringState = {
  /** 服务端聚餐 ID */
  serverId: string | null;
  roomId: string | null;
  joinUrl: string;
  shareToken: string | null;
  title: string;
  headcount: number;
  wishes: GatheringWish[];
  drinks: GatheringDrink[];
  beginGathering: (title: string, headcount: number) => Promise<void>;
  joinGathering: (shareToken: string) => Promise<void>;
  addWish: (participantLabel: string, dishName: string) => Promise<void>;
  addDrink: (label: string, qtyLabel?: string) => void;
  removeDrink: (id: string) => void;
  syncDrinksToServer: () => Promise<void>;
  reset: () => void;
};

export const useGatheringStore = create<GatheringState>((set, get) => ({
  serverId: null,
  roomId: null,
  joinUrl: "",
  shareToken: null,
  title: "",
  headcount: 6,
  wishes: [],
  drinks: [],
  beginGathering: async (title, headcount) => {
    const n = Number.isFinite(headcount) ? Math.round(headcount) : 6;
    const safe = Math.min(50, Math.max(1, n));
    try {
      const detail = await gatheringApi.createGathering(safe, title.trim());
      set({
        serverId: detail.id,
        roomId: detail.id,
        shareToken: detail.shareToken,
        joinUrl: buildJoinUrl(detail.shareToken),
        title: detail.title ?? title.trim(),
        headcount: detail.headcount,
        wishes: [],
        drinks: [],
      });
    } catch {
      // fallback 本地模式
      const roomId = `gathering_${Date.now()}`;
      set({
        serverId: null,
        roomId,
        shareToken: null,
        joinUrl: buildJoinUrl(roomId),
        title: title.trim(),
        headcount: safe,
        wishes: [],
        drinks: [],
      });
    }
  },
  joinGathering: async (token) => {
    try {
      const result = await gatheringApi.joinGathering(token);
      const detail = await gatheringApi.getGathering(result.gatheringId);
      const serverWishes: GatheringWish[] = (detail.wishes ?? []).map((w) => ({
        id: w.id,
        participantLabel: w.userId,
        dishName: w.freeText ?? w.dishId ?? "",
        createdAt: new Date(w.createdAt).getTime(),
      }));
      set({
        serverId: detail.id,
        roomId: detail.id,
        shareToken: detail.shareToken,
        joinUrl: buildJoinUrl(detail.shareToken),
        title: detail.title ?? "",
        headcount: detail.headcount,
        wishes: serverWishes,
        drinks: (detail.beveragePresets ?? []).map((label, i) => ({
          id: `bp_${i}`,
          label,
          qtyLabel: "",
          createdAt: Date.now(),
        })),
      });
    } catch {
      /* ignore */
    }
  },
  addWish: async (participantLabel, dishName) => {
    const dish = dishName.trim();
    if (!dish) return;
    const id = `w_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    set((s) => ({
      wishes: [
        {
          id,
          participantLabel: participantLabel.trim() || "好友",
          dishName: dish,
          createdAt: Date.now(),
        },
        ...s.wishes,
      ],
    }));
    const { serverId } = get();
    if (serverId) {
      try {
        await gatheringApi.addGatheringWish(serverId, dish);
      } catch {
        /* 乐观更新已写入本地 */
      }
    }
  },
  addDrink: (label, qtyLabel) => {
    const name = label.trim();
    if (!name) return;
    const id = `d_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const qty = (qtyLabel ?? "").trim() || "若干";
    set((s) => ({
      drinks: [{ id, label: name, qtyLabel: qty, createdAt: Date.now() }, ...s.drinks],
    }));
  },
  removeDrink: (id) =>
    set((s) => ({
      drinks: s.drinks.filter((d) => d.id !== id),
    })),
  syncDrinksToServer: async () => {
    const { serverId, drinks } = get();
    if (!serverId) return;
    try {
      await gatheringApi.patchGathering(serverId, {
        beveragePresets: drinks.map((d) => d.label),
        includeBeverageInShopping: true,
      });
    } catch {
      /* ignore */
    }
  },
  reset: () =>
    set({
      serverId: null,
      roomId: null,
      joinUrl: "",
      shareToken: null,
      title: "",
      headcount: 6,
      wishes: [],
      drinks: [],
    }),
}));
