export type VideoItem = {
  videoId: string;
  title: string;
  url: string;
  durationSec?: number;
  likeCount?: number;
};

export type RecommendItem = {
  dishId: string;
  dishName: string;
  matchScore: number;
  cookTimeMinutes: number;
  difficulty: number;
  missingIngredients: string[];
  videos: VideoItem[];
};

export type RecommendResponse = {
  list: RecommendItem[];
  total: number;
};

export type DishResponse = {
  dishId: string;
  dishName: string;
  cookTimeMinutes?: number;
  difficulty?: number;
  ingredients: {
    main: string[];
    secondary: string[];
    seasoning: string[];
  };
  stepsSummary: string[];
  videos: VideoItem[];
};

export type FavoriteItem = {
  dishId: string;
  dishName: string;
  createdAt?: string;
};

export type HistoryItem = {
  dishId: string;
  dishName: string;
  viewedAt: string;
  difficulty?: number;
};

export type FavoritesResponse = {
  list: FavoriteItem[];
  total: number;
};

export type HistoryResponse = {
  list: HistoryItem[];
  total: number;
};

export type PopularDishItem = {
  dishId: string;
  dishName: string;
  cookTimeMinutes?: number;
  difficulty?: number;
};

export type PopularDishesResponse = {
  list: PopularDishItem[];
  total: number;
};

