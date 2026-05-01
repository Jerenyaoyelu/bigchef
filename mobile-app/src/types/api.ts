export type VideoItem = {
  videoId: string;
  title: string;
  url: string;
  durationSec?: number;
  likeCount?: number;
};

/** 推荐列表中的缺料项（不含调料） */
export type MissingIngredientItem = {
  name: string;
  role: "main" | "secondary";
};

export type RecommendItem = {
  dishId: string;
  dishName: string;
  matchScore: number;
  cookTimeMinutes: number;
  difficulty: number;
  missingIngredients: MissingIngredientItem[];
  videos: VideoItem[];
  /** 菜谱点赞 + 关联视频点赞合计 */
  likeCount?: number;
  /** 列表合并时：菜谱库匹配 vs AI 生成 */
  entrySource?: "db" | "ai";
};

/** 从列表进入详情时携带的已知字段，用于首屏秒开 */
export type DishDetailPrefetch = {
  dishId: string;
  dishName: string;
  cookTimeMinutes?: number;
  difficulty?: number;
  videos?: VideoItem[];
};

export type RecommendAiMeta = {
  used?: boolean;
  triggeredBy?: string;
  generationSaved?: boolean;
  /** 混合推荐时：菜谱库是否因条数上限被截断 */
  dbListTruncated?: boolean;
};

export type RecommendResponse = {
  list: RecommendItem[];
  total: number;
  page?: number;
  pageSize?: number;
  /** 仅 source=db 时：是否还有下一页（服务端分页） */
  hasMore?: boolean;
  source?: "db" | "ai_generated" | "mixed";
  aiMeta?: RecommendAiMeta;
  actions?: Array<{ actionType: string; text: string }>;
};

export type DishResponse = {
  dishId: string;
  dishName: string;
  /** 菜谱点赞 + 关联视频点赞合计 */
  likeCount?: number;
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

