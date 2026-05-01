import { postJson } from "../../../api/http";
import { RecommendResponse } from "../../../types/api";

export type FetchRecommendOptions = {
  aiBoost?: boolean;
  page?: number;
  pageSize?: number;
};

export async function fetchRecommendByIngredients(ingredients: string[], options?: FetchRecommendOptions) {
  return postJson<RecommendResponse>("/api/v1/recommend/by-ingredients", {
    ingredients,
    page: options?.page ?? 1,
    pageSize: options?.pageSize ?? 10,
    aiBoost: options?.aiBoost ?? false,
  });
}

