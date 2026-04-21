import { postJson } from "../../../api/http";
import { RecommendResponse } from "../../../types/api";

export function fetchRecommendByIngredients(ingredients: string[]) {
  return postJson<RecommendResponse>("/api/v1/recommend/by-ingredients", {
    ingredients,
    page: 1,
    pageSize: 10,
  });
}

