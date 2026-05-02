import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { MealKind, WeekdaySlot } from "./weekMenuStore";
import { useWeekMenuStore } from "./weekMenuStore";

export type WishlistItem = {
  id: string;
  dishName: string;
  /** 展示用简称，如「小明」「我」 */
  authorLabel: string;
  createdAt: number;
  linkedDay: WeekdaySlot | null;
  linkedMeal: MealKind | null;
};

function defaultWishlist(): WishlistItem[] {
  const now = Date.now();
  return [
    {
      id: "w1",
      dishName: "糖醋排骨",
      authorLabel: "小明",
      createdAt: now - 2 * 86400000,
      linkedDay: null,
      linkedMeal: null,
    },
    {
      id: "w2",
      dishName: "水煮鱼",
      authorLabel: "小红",
      createdAt: now - 5 * 86400000,
      linkedDay: null,
      linkedMeal: null,
    },
    {
      id: "w3",
      dishName: "烤羊排",
      authorLabel: "我",
      createdAt: now - 8 * 86400000,
      linkedDay: null,
      linkedMeal: null,
    },
  ];
}

type WishlistState = {
  items: WishlistItem[];
  addItem: (dishName: string, authorLabel?: string) => void;
  removeItem: (id: string) => void;
  linkToWeekMenu: (id: string, day: WeekdaySlot, meal: MealKind) => void;
  unlinkFromWeekMenu: (id: string) => void;
};

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: defaultWishlist(),
      addItem: (dishName, authorLabel = "我") => {
        const trimmed = dishName.trim();
        if (!trimmed) return;
        const id = `w_${Date.now()}`;
        set((s) => ({
          items: [
            ...s.items,
            {
              id,
              dishName: trimmed,
              authorLabel,
              createdAt: Date.now(),
              linkedDay: null,
              linkedMeal: null,
            },
          ],
        }));
      },
      removeItem: (id) => {
        const item = get().items.find((i) => i.id === id);
        if (item?.linkedDay && item.linkedMeal) {
          useWeekMenuStore.getState().setDish(item.linkedDay, item.linkedMeal, null);
        }
        set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
      },
      linkToWeekMenu: (id, day, meal) => {
        const item = get().items.find((i) => i.id === id);
        if (!item) return;
        if (item.linkedDay && item.linkedMeal) {
          useWeekMenuStore.getState().setDish(item.linkedDay, item.linkedMeal, null);
        }
        useWeekMenuStore.getState().setDish(day, meal, item.dishName);
        set((s) => ({
          items: s.items.map((i) =>
            i.id === id ? { ...i, linkedDay: day, linkedMeal: meal } : i,
          ),
        }));
      },
      unlinkFromWeekMenu: (id) => {
        const item = get().items.find((i) => i.id === id);
        if (!item?.linkedDay || !item.linkedMeal) return;
        useWeekMenuStore.getState().setDish(item.linkedDay, item.linkedMeal, null);
        set((s) => ({
          items: s.items.map((i) =>
            i.id === id ? { ...i, linkedDay: null, linkedMeal: null } : i,
          ),
        }));
      },
    }),
    {
      name: "bigchef-wishlist",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ items: s.items }),
    },
  ),
);

export function formatWishMeta(authorLabel: string, createdAt: number): string {
  const diffMs = Date.now() - createdAt;
  const d = Math.max(0, Math.floor(diffMs / 86400000));
  if (d === 0) return `${authorLabel} 添加 · 今天`;
  if (d === 1) return `${authorLabel} 添加 · 昨天`;
  if (d < 7) return `${authorLabel} 添加 · ${d}天前`;
  if (d < 14) return `${authorLabel} 添加 · 1周前`;
  const w = Math.floor(d / 7);
  return `${authorLabel} 添加 · ${w}周前`;
}

export function pendingWishCount(items: WishlistItem[]): number {
  return items.filter((i) => !i.linkedDay).length;
}

/** 家庭详情入口副文案 */
export function wishlistMenuSubtitle(items: WishlistItem[]): string {
  const n = pendingWishCount(items);
  return n === 0 ? "暂无等待安排的菜" : `${n}个菜等待安排`;
}
