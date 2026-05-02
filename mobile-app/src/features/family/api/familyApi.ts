import { deleteJson, getJson, patchJson, postJson } from "../../../api/http";

// --- Family ---

export type FamilyMember = {
  id: string;
  familyId: string;
  userId: string;
  role: string;
  createdAt: string;
};

export type FamilyDetail = {
  id: string;
  name: string;
  ownerId: string;
  inviteCode: string;
  householdRelation: string;
  collaborationMode: string;
  hostOnlyEdit: boolean;
  createdAt: string;
  updatedAt: string;
  members: FamilyMember[];
};

export function createFamily(name: string, householdRelation: "couple" | "roommates") {
  return postJson<FamilyDetail>("/api/v2/families", { name, householdRelation });
}

export function joinFamily(inviteCode: string) {
  return postJson<{ familyId: string }>("/api/v2/families/join", { inviteCode });
}

export function getFamily(familyId: string) {
  return getJson<FamilyDetail>(`/api/v2/families/${familyId}`);
}

export function patchFamily(familyId: string, body: { name?: string; householdRelation?: string }) {
  return patchJson<FamilyDetail>(`/api/v2/families/${familyId}`, body);
}

// --- Week Menu ---

export type MenuWeek = {
  id: string;
  familyId: string;
  weekStart: string;
  status: string;
  lastGeneratedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MealPlan = {
  id: string;
  familyId: string;
  menuWeekId: string;
  dishId: string;
  dishName: string | null;
  weekday: string | null;
  mealKind: string | null;
  date: string;
  assigneeUserId: string | null;
  status: string;
  createdAt: string;
};

export type MenuWeekWithPlans = MenuWeek & { mealPlans: MealPlan[] };

export function listMenuWeeks(familyId: string) {
  return getJson<MenuWeek[]>(`/api/v2/families/${familyId}/menu-weeks`);
}

export function upsertMenuWeek(familyId: string, weekStart?: string) {
  return postJson<MenuWeek>(`/api/v2/families/${familyId}/menu-weeks`, { weekStart });
}

export function getMenuWeek(familyId: string, weekId: string) {
  return getJson<MenuWeekWithPlans>(`/api/v2/families/${familyId}/menu-weeks/${weekId}`);
}

export function patchMenuWeek(familyId: string, weekId: string, body: { status?: string }) {
  return patchJson<MenuWeek>(`/api/v2/families/${familyId}/menu-weeks/${weekId}`, body);
}

export function generateWeekMenu(familyId: string, weekId: string, useAiFill = false) {
  return postJson<MealPlan[]>(`/api/v2/families/${familyId}/menu-weeks/${weekId}/generate-menu`, { useAiFill });
}

export function notifyWeekMenu(familyId: string, weekId: string) {
  return postJson<{ ok: boolean }>(`/api/v2/families/${familyId}/menu-weeks/${weekId}/notify`, {});
}

export function addMealPlan(
  familyId: string,
  body: {
    menuWeekId: string;
    dishId: string;
    date: string;
    dishName?: string;
    weekday?: string;
    mealKind?: string;
  },
) {
  return postJson<MealPlan>(`/api/v2/families/${familyId}/plans`, body);
}

export function patchMealPlan(
  familyId: string,
  planId: string,
  body: { status?: string; dishId?: string; dishName?: string; date?: string; weekday?: string; mealKind?: string },
) {
  return patchJson<MealPlan>(`/api/v2/families/${familyId}/plans/${planId}`, body);
}

// --- Wishes ---

export type WishItem = {
  id: string;
  familyId: string;
  userId: string;
  dishId: string;
  note: string | null;
  linkedDay: string | null;
  linkedMeal: string | null;
  status: string;
  createdAt: string;
};

export function listWishes(familyId: string) {
  return getJson<WishItem[]>(`/api/v2/families/${familyId}/wishes`);
}

export function addWish(familyId: string, dishId: string, note?: string, linkedDay?: string, linkedMeal?: string) {
  return postJson<WishItem>(`/api/v2/families/${familyId}/wishes`, { dishId, note, linkedDay, linkedMeal });
}

export function deleteWish(familyId: string, wishId: string) {
  return deleteJson<{ ok: boolean }>(`/api/v2/families/${familyId}/wishes/${wishId}`);
}

// --- Stats ---

export type DishStatsResponse = {
  windowDays: number;
  items: Array<{ dishId: string; doneCount: number }>;
};

export function getDishStats(familyId: string, windowDays = 30) {
  return getJson<DishStatsResponse>(`/api/v2/families/${familyId}/stats/dishes?windowDays=${windowDays}`);
}

// --- Shopping List ---

export type ShoppingListItem = {
  id: string;
  listId: string;
  ingredientKey: string;
  displayName: string;
  quantity: string | null;
  unit: string | null;
  category: string | null;
  batchIndex: number | null;
  excludedReason: string | null;
  purchasedAt: string | null;
  purchasedByUserId: string | null;
  sortOrder: number;
};

export type ShoppingList = {
  id: string;
  familyId: string;
  menuWeekId: string | null;
  mode: string;
  createdAt: string;
  updatedAt: string;
  items: ShoppingListItem[];
};

export function generateShoppingList(familyId: string, weekId: string, mode: "single" | "two_phase" = "single") {
  return postJson<ShoppingList>(
    `/api/v2/families/${familyId}/menu-weeks/${weekId}/shopping-list/generate`,
    { mode },
  );
}

export function getShoppingList(familyId: string, listId: string) {
  return getJson<ShoppingList>(`/api/v2/families/${familyId}/shopping-lists/${listId}`);
}

export function patchShoppingList(
  familyId: string,
  listId: string,
  items: Array<{ id: string; purchased?: boolean; excludedReason?: string | null }>,
) {
  return patchJson<ShoppingList>(`/api/v2/families/${familyId}/shopping-lists/${listId}`, { items });
}
