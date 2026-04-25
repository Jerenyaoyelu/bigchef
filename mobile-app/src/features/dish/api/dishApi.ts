import { postJson } from "../../../api/http";
import { DishResponse } from "../../../types/api";

const MOCK_DISH_RESPONSE: DishResponse = {
  dishId: "mock-cola-wings",
  dishName: "可乐鸡翅",
  ingredients: {
    main: ["鸡翅 8个", "可乐 300ml"],
    secondary: ["姜片 3片", "葱段 适量"],
    seasoning: ["生抽 2勺", "老抽 1勺", "料酒 1勺", "食用油 适量"],
  },
  stepsSummary: [
    "鸡翅洗净，两面各划两刀，方便入味",
    "冷水下锅焯水，加料酒和姜片去腥，煮开后捞出",
    "热锅冷油，放入鸡翅煎至两面金黄",
    "加入姜片、葱段爆香",
    "倒入生抽、老抽翻炒上色",
    "倒入可乐没过鸡翅，大火烧开转中小火",
    "炖煮20分钟左右，大火收汁即可",
  ],
  videos: [{ videoId: "video-cola-wings", title: "可乐鸡翅家常做法", url: "https://example.com/video/cola-wings" }],
};

export async function fetchDishByName(dishName: string) {
  try {
    return await postJson<DishResponse>("/api/v1/dishes/search", { dishName });
  } catch {
    return { ...MOCK_DISH_RESPONSE, dishName: dishName || MOCK_DISH_RESPONSE.dishName };
  }
}

