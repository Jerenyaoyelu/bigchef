import { postJson } from "../../../api/http";
import { DishResponse } from "../../../types/api";

export function fetchDishByName(dishName: string) {
  return postJson<DishResponse>("/api/v1/dishes/search", { dishName });
}

