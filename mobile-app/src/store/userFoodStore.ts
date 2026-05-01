import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { toggleDishLike as toggleDishLikeApi } from "../features/dish/api/dishApi";
import {
  addFavorite as addFavoriteApi,
  addHistory as addHistoryApi,
  clearHistory as clearHistoryApi,
  fetchDishLikes,
  fetchFavorites,
  fetchHistory,
  removeFavorite as removeFavoriteApi,
} from "../features/profile/api/profileApi";

type FavoriteDish = {
  dishId: string;
  dishName: string;
};

type RecentDish = {
  dishId: string;
  dishName: string;
  viewedAt: string;
  difficulty?: number;
};

type UserFoodState = {
  favorites: FavoriteDish[];
  likedDishIds: string[];
  /** 点赞接口返回后的展示用总数（含视频赞），以服务端为准 */
  likeCountByDish: Record<string, number>;
  recentViews: RecentDish[];
  hydrateFromServer: () => Promise<void>;
  toggleFavorite: (dish: FavoriteDish) => Promise<void>;
  toggleDishLike: (dishId: string) => Promise<{ liked: boolean; likeCount: number } | null>;
  addRecentView: (dish: FavoriteDish) => Promise<void>;
  clearRecentViews: () => Promise<void>;
};

const MAX_RECENT = 10;

export const useUserFoodStore = create<UserFoodState>()(
  persist(
    (set, get) => ({
      favorites: [],
      likedDishIds: [],
      likeCountByDish: {},
      recentViews: [],
      hydrateFromServer: async () => {
        const [favResult, histResult, likesResult] = await Promise.allSettled([
          fetchFavorites(),
          fetchHistory(MAX_RECENT),
          fetchDishLikes(),
        ]);
        set((state) => ({
          favorites:
            favResult.status === "fulfilled"
              ? favResult.value.list.map((item) => ({ dishId: item.dishId, dishName: item.dishName }))
              : state.favorites,
          recentViews:
            histResult.status === "fulfilled"
              ? histResult.value.list.map((item) => ({
                  dishId: item.dishId,
                  dishName: item.dishName,
                  viewedAt: item.viewedAt,
                  difficulty: item.difficulty,
                }))
              : state.recentViews,
          likedDishIds: likesResult.status === "fulfilled" ? likesResult.value.dishIds : state.likedDishIds,
        }));
      },
      toggleFavorite: async (dish) => {
        const exists = get().favorites.some((fav) => fav.dishId === dish.dishId);
        set((state) => {
          if (exists) {
            return { favorites: state.favorites.filter((fav) => fav.dishId !== dish.dishId) };
          }
          return { favorites: [{ dishId: dish.dishId, dishName: dish.dishName }, ...state.favorites] };
        });

        try {
          if (exists) {
            await removeFavoriteApi(dish.dishId);
          } else {
            await addFavoriteApi(dish.dishId);
          }
        } catch {
          set((state) => {
            if (exists) {
              return { favorites: [{ dishId: dish.dishId, dishName: dish.dishName }, ...state.favorites] };
            }
            return { favorites: state.favorites.filter((fav) => fav.dishId !== dish.dishId) };
          });
        }
      },
      toggleDishLike: async (dishId: string) => {
        try {
          const res = await toggleDishLikeApi(dishId);
          set((state) => ({
            likedDishIds: res.liked
              ? [...new Set([...state.likedDishIds, dishId])]
              : state.likedDishIds.filter((id) => id !== dishId),
            likeCountByDish: { ...state.likeCountByDish, [dishId]: res.likeCount },
          }));
          return res;
        } catch {
          return null;
        }
      },
      addRecentView: async (dish) => {
        const previous = get().recentViews;
        set((state) => {
          const deduped = state.recentViews.filter((item) => item.dishId !== dish.dishId);
          const next: RecentDish[] = [{ ...dish, viewedAt: new Date().toISOString() }, ...deduped];
          return { recentViews: next.slice(0, MAX_RECENT) };
        });
        try {
          await addHistoryApi(dish.dishId);
        } catch {
          set({ recentViews: previous });
        }
      },
      clearRecentViews: async () => {
        const previous = get().recentViews;
        set({ recentViews: [] });
        try {
          await clearHistoryApi();
        } catch {
          set({ recentViews: previous });
        }
      },
    }),
    {
      name: "bigchef-user-food-store",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        favorites: state.favorites,
        likedDishIds: state.likedDishIds,
        recentViews: state.recentViews,
      }),
    }
  )
);
