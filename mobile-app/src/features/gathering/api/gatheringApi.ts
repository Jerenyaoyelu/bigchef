import { deleteJson, getJson, patchJson, postJson } from "../../../api/http";

export type GatheringWish = {
  id: string;
  gatheringId: string;
  userId: string;
  dishId: string | null;
  freeText: string | null;
  createdAt: string;
};

export type GatheringMember = {
  id: string;
  gatheringId: string;
  userId: string;
  joinedAt: string;
};

export type GatheringDetail = {
  id: string;
  creatorId: string;
  title: string | null;
  headcount: number;
  status: string;
  shareToken: string;
  expiresAt: string | null;
  menuItems: unknown;
  shoppingList: unknown;
  beveragePresets: string[];
  beverageNote: string | null;
  includeBeverageInShopping: boolean;
  createdAt: string;
  updatedAt: string;
  wishes: GatheringWish[];
  members: GatheringMember[];
};

export function createGathering(headcount: number, title?: string) {
  return postJson<GatheringDetail>("/api/v2/gatherings", { headcount, title });
}

export function joinGathering(shareToken: string) {
  return postJson<{ gatheringId: string }>("/api/v2/gatherings/join", { shareToken });
}

export function getGathering(id: string) {
  return getJson<GatheringDetail>(`/api/v2/gatherings/${id}`);
}

export function addGatheringWish(id: string, freeText: string, dishId?: string) {
  return postJson<GatheringWish>(`/api/v2/gatherings/${id}/wishes`, { freeText, dishId });
}

export function generateGatheringMenu(id: string) {
  return postJson<GatheringDetail>(`/api/v2/gatherings/${id}/generate-menu`, {});
}

export function generateGatheringShoppingList(id: string) {
  return postJson<GatheringDetail>(`/api/v2/gatherings/${id}/shopping-list/generate`, {});
}

export function patchGathering(id: string, body: {
  beveragePresets?: string[];
  beverageNote?: string;
  includeBeverageInShopping?: boolean;
  menuItems?: unknown;
  shoppingList?: unknown;
  status?: string;
}) {
  return patchJson<GatheringDetail>(`/api/v2/gatherings/${id}`, body);
}

export function closeGathering(id: string) {
  return postJson<GatheringDetail>(`/api/v2/gatherings/${id}/close`, {});
}
