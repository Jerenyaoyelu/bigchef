import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { getFamily } from "../features/family/api/familyApi";

export type HouseholdRelation = "couple" | "roommates";

type SetJoinedPayload = {
  familyId?: string;
  spaceTitle: string;
  memberCount?: number;
  plannedDaysThisWeek?: number;
  familyDisplayName: string;
  relation: HouseholdRelation;
};

type FamilySpaceState = {
  joined: boolean;
  familyId: string | null;
  spaceTitle: string;
  memberCount: number;
  plannedDaysThisWeek: number;
  weeklyDishCount: number;
  familyDisplayName: string;
  relation: HouseholdRelation | null;
  setJoined: (p: SetJoinedPayload) => void;
  setPlanStats: (p: { plannedDaysThisWeek: number; weeklyDishCount: number }) => void;
  hydrateFromServer: () => Promise<void>;
  clear: () => void;
};

export const useFamilySpaceStore = create<FamilySpaceState>()(
  persist(
    (set, get) => ({
      joined: false,
      familyId: null,
      spaceTitle: "情侣空间",
      memberCount: 1,
      plannedDaysThisWeek: 0,
      weeklyDishCount: 0,
      familyDisplayName: "",
      relation: null,
      setJoined: (p) =>
        set({
          joined: true,
          familyId: p.familyId ?? null,
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
      hydrateFromServer: async () => {
        const { familyId, joined } = get();
        if (!joined || !familyId) return;
        try {
          const detail = await getFamily(familyId);
          const isCouple = detail.householdRelation === "couple";
          set({
            memberCount: detail.members.length,
            spaceTitle: isCouple ? "情侣空间" : "合租空间",
            familyDisplayName: detail.name,
            relation: detail.householdRelation as HouseholdRelation,
          });
        } catch {
          /* 保持本地缓存 */
        }
      },
      clear: () =>
        set({
          joined: false,
          familyId: null,
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
        familyId: s.familyId,
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
