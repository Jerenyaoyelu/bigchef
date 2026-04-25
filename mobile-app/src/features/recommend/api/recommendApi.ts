import { postJson } from "../../../api/http";
import { RecommendResponse } from "../../../types/api";

const MOCK_RECOMMEND_RESPONSE: RecommendResponse = {
  total: 2,
  list: [
    {
      dishId: "mock-tomato-eggs",
      dishName: "西红柿炒鸡蛋",
      matchScore: 0.5,
      cookTimeMinutes: 15,
      difficulty: 1,
      missingIngredients: ["鸡蛋"],
      videos: [{ videoId: "video-1", title: "家常西红柿炒蛋教程", url: "https://example.com/video/tomato-eggs" }],
    },
    {
      dishId: "mock-mapo-tofu",
      dishName: "麻婆豆腐",
      matchScore: 0.5,
      cookTimeMinutes: 20,
      difficulty: 1,
      missingIngredients: ["猪肉末"],
      videos: [],
    },
  ],
};

export async function fetchRecommendByIngredients(ingredients: string[]) {
  try {
    return await postJson<RecommendResponse>("/api/v1/recommend/by-ingredients", {
      ingredients,
      page: 1,
      pageSize: 10,
    });
  } catch {
    return MOCK_RECOMMEND_RESPONSE;
  }
}

