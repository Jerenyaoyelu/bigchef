import { deleteJson, getJson, postJson } from "../../../api/http";
import { FavoritesResponse, HistoryResponse } from "../../../types/api";

export function fetchFavorites() {
  return getJson<FavoritesResponse>("/api/v1/user/favorites");
}

export function addFavorite(dishId: string) {
  return postJson<{ dishId: string; dishName: string }>("/api/v1/user/favorites", { dishId });
}

export function removeFavorite(dishId: string) {
  return deleteJson<{ ok: boolean }>(`/api/v1/user/favorites/${dishId}`);
}

export function fetchHistory(limit = 20) {
  return getJson<HistoryResponse>(`/api/v1/user/history?limit=${limit}`);
}

export function addHistory(dishId: string) {
  return postJson<{ dishId: string; dishName: string }>("/api/v1/user/history", { dishId });
}

export function clearHistory() {
  return deleteJson<{ ok: boolean }>("/api/v1/user/history");
}
