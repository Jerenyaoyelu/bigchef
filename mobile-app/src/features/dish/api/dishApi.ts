import { getJson, postJson } from "../../../api/http";
import { DishResponse, PopularDishesResponse } from "../../../types/api";

export async function fetchDishByName(dishName: string) {
  return postJson<DishResponse>("/api/v1/dishes/search", { dishName });
}

export async function fetchPopularDishes() {
  return getJson<PopularDishesResponse>("/api/v1/dishes/popular?limit=8");
}

export async function fetchDishById(dishId: string) {
  return getJson<DishResponse>(`/api/v1/dishes/${dishId}`);
}

export async function toggleDishLike(dishId: string) {
  return postJson<{ liked: boolean; likeCount: number }>(`/api/v1/dishes/${dishId}/like`, {});
}

