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
  ingredients: {
    main: string[];
    secondary: string[];
    seasoning: string[];
  };
  stepsSummary: string[];
  videos: VideoItem[];
};

