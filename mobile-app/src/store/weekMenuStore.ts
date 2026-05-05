import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import * as familyApi from "../features/family/api/familyApi";
import { useFamilySpaceStore } from "./familySpaceStore";

export type WeekdaySlot = "mon" | "tue" | "wed" | "thu" | "fri";

export type MealKind = "breakfast" | "lunch" | "dinner";

export const WEEKDAY_ORDER: WeekdaySlot[] = ["mon", "tue", "wed", "thu", "fri"];

export const WEEKDAY_LABELS: Record<WeekdaySlot, string> = {
  mon: "周一",
  tue: "周二",
  wed: "周三",
  thu: "周四",
  fri: "周五",
};

export const MEAL_ORDER: MealKind[] = ["breakfast", "lunch", "dinner"];

export const MEAL_LABELS: Record<MealKind, string> = {
  breakfast: "早餐",
  lunch: "午餐",
  dinner: "晚餐",
};

export type DaySlots = {
  breakfast: string | null;
  lunch: string | null;
  dinner: string | null;
};

function emptyDay(): DaySlots {
  return { breakfast: null, lunch: null, dinner: null };
}

function emptySlots(): Record<WeekdaySlot, DaySlots> {
  return {
    mon: emptyDay(),
    tue: emptyDay(),
    wed: emptyDay(),
    thu: emptyDay(),
    fri: emptyDay(),
  };
}

function totalDishCount(slots: Record<WeekdaySlot, DaySlots>): number {
  let n = 0;
  for (const day of WEEKDAY_ORDER) {
    const d = slots[day];
    for (const m of MEAL_ORDER) {
      if (d[m]?.trim()) n++;
    }
  }
  return n;
}

function plannedDayCount(slots: Record<WeekdaySlot, DaySlots>): number {
  let days = 0;
  for (const day of WEEKDAY_ORDER) {
    const d = slots[day];
    if (d.breakfast?.trim() || d.lunch?.trim() || d.dinner?.trim()) days++;
  }
  return Math.min(days, 7);
}

function syncPlanStats(slots: Record<WeekdaySlot, DaySlots>) {
  if (!useFamilySpaceStore.getState().joined) return;
  useFamilySpaceStore.getState().setPlanStats({
    plannedDaysThisWeek: plannedDayCount(slots),
    weeklyDishCount: totalDishCount(slots),
  });
}

function normalizeDay(raw: unknown): DaySlots {
  if (!raw || typeof raw !== "object") return emptyDay();
  const o = raw as Record<string, unknown>;
  return {
    breakfast: typeof o.breakfast === "string" ? o.breakfast : null,
    lunch: typeof o.lunch === "string" ? o.lunch : null,
    dinner: typeof o.dinner === "string" ? o.dinner : null,
  };
}

/** 迁移旧版「每天一道晚餐」结构，并规范化三餐字段 */
function migratePersistedSlots(raw: unknown): Record<WeekdaySlot, DaySlots> {
  if (!raw || typeof raw !== "object") return emptySlots();
  const slots = raw as Record<string, unknown>;
  const sample = slots.mon;
  if (sample && typeof sample === "object" && sample !== null && "breakfast" in sample) {
    const next = emptySlots();
    for (const day of WEEKDAY_ORDER) {
      next[day] = normalizeDay(slots[day]);
    }
    return next;
  }
  const next = emptySlots();
  for (const day of WEEKDAY_ORDER) {
    const v = slots[day];
    if (typeof v === "string" && v.trim()) {
      next[day] = { breakfast: null, lunch: null, dinner: v.trim() };
    }
  }
  return next;
}

type WeekMenuState = {
  weekId: string | null;
  slots: Record<WeekdaySlot, DaySlots>;
  loadingFromServer: boolean;
  setDish: (day: WeekdaySlot, meal: MealKind, name: string | null) => void;
  /** 从后端加载周菜单（如有） */
  loadFromServer: (familyId: string) => Promise<void>;
  /** 同步单个菜品到后端 */
  syncDishToServer: (day: WeekdaySlot, meal: MealKind, name: string, familyId: string) => Promise<void>;
  reset: () => void;
};

export const useWeekMenuStore = create<WeekMenuState>()(
  persist(
    (set, get) => ({
      weekId: null,
      slots: emptySlots(),
      loadingFromServer: false,
      setDish: (day, meal, name) => {
        const trimmed = name?.trim() || null;
        set(() => {
          const prev = get().slots;
          const nextDay = { ...prev[day], [meal]: trimmed };
          const next = { ...prev, [day]: nextDay };
          syncPlanStats(next);
          return { slots: next };
        });
      },
      loadFromServer: async (familyId: string) => {
        set({ loadingFromServer: true });
        try {
          const weeks = await familyApi.listMenuWeeks(familyId);
          if (weeks.length > 0) {
            const week = weeks[0]!;
            const detail = await familyApi.getMenuWeek(familyId, week.id);
            const next = emptySlots();
            for (const plan of detail.mealPlans) {
              const day = (plan.weekday ?? null) as WeekdaySlot | null;
              const meal = (plan.mealKind ?? null) as MealKind | null;
              const name = plan.dishName ?? plan.dishId;
              if (day && meal && WEEKDAY_ORDER.includes(day) && MEAL_ORDER.includes(meal)) {
                next[day][meal] = name;
              }
            }
            set({ slots: next, weekId: week.id });
            syncPlanStats(next);
          }
        } catch {
          /* keep local */
        } finally {
          set({ loadingFromServer: false });
        }
      },
      syncDishToServer: async (day, meal, name, familyId) => {
        const { weekId } = get();
        if (!weekId) return;
        try {
          await familyApi.addMealPlan(familyId, {
            menuWeekId: weekId,
            dishId: `custom_${name}`,
            date: new Date().toISOString(),
            dishName: name,
            weekday: day,
            mealKind: meal,
          });
        } catch {
          /* ignore */
        }
      },
      reset: () => {
        const empty = emptySlots();
        set({ slots: empty, weekId: null });
        syncPlanStats(empty);
      },
    }),
    {
      name: "bigchef-week-menu",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ slots: s.slots, weekId: s.weekId }),
      merge: (persistedState, currentState) => {
        const p = (persistedState ?? {}) as Partial<WeekMenuState>;
        if (p.slots === undefined) {
          return { ...currentState, ...p };
        }
        return {
          ...currentState,
          ...p,
          slots: migratePersistedSlots(p.slots),
          weekId: (p as { weekId?: string | null }).weekId ?? null,
        };
      },
      onRehydrateStorage: () => (state) => {
        if (state?.slots) syncPlanStats(state.slots);
      },
    },
  ),
);
