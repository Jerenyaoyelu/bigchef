import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type HouseholdRelation = "couple" | "roommates";

type SetJoinedPayload = {
  spaceTitle: string;
  memberCount?: number;
  plannedDaysThisWeek?: number;
  familyDisplayName: string;
  relation: HouseholdRelation;
};

type FamilySpaceState = {
  joined: boolean;
  /** 列表主标题，如「情侣空间」「合租空间」 */
  spaceTitle: string;
  memberCount: number;
  /** 本周已安排菜单的天数 0–7（与周菜单联动） */
  plannedDaysThisWeek: number;
  /** 详情页「本周菜单」统计：已添加的菜品数 */
  weeklyDishCount: number;
  familyDisplayName: string;
  relation: HouseholdRelation | null;
  setJoined: (p: SetJoinedPayload) => void;
  setPlanStats: (p: { plannedDaysThisWeek: number; weeklyDishCount: number }) => void;
  clear: () => void;
};

export const useFamilySpaceStore = create<FamilySpaceState>()(
  persist(
    (set) => ({
      joined: false,
      spaceTitle: "情侣空间",
      memberCount: 1,
      plannedDaysThisWeek: 0,
      weeklyDishCount: 0,
      familyDisplayName: "",
      relation: null,
      setJoined: (p) =>
        set({
          joined: true,
          spaceTitle: p.spaceTitle,
          memberCount: p.memberCount ?? 1,
          plannedDaysThisWeek: p.plannedDaysThisWeek ?? 0,
          weeklyDishCount: 0,
          familyDisplayName: p.familyDisplayName,
          relation: p.relation,
        }),
      setPlanStats: (p) =>
        set({
          plannedDaysThisWeek: p.plannedDaysThisWeek,
          weeklyDishCount: p.weeklyDishCount,
        }),
      clear: () =>
        set({
          joined: false,
          spaceTitle: "情侣空间",
          memberCount: 1,
          plannedDaysThisWeek: 0,
          weeklyDishCount: 0,
          familyDisplayName: "",
          relation: null,
        }),
    }),
    {
      name: "bigchef-family-space",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        joined: s.joined,
        spaceTitle: s.spaceTitle,
        memberCount: s.memberCount,
        plannedDaysThisWeek: s.plannedDaysThisWeek,
        weeklyDishCount: s.weeklyDishCount,
        familyDisplayName: s.familyDisplayName,
        relation: s.relation,
      }),
    },
  ),
);
