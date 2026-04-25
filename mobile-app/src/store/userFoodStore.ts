import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  addFavorite as addFavoriteApi,
  addHistory as addHistoryApi,
  clearHistory as clearHistoryApi,
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
  recentViews: RecentDish[];
  hydrateFromServer: () => Promise<void>;
  toggleFavorite: (dish: FavoriteDish) => Promise<void>;
  addRecentView: (dish: FavoriteDish) => Promise<void>;
  clearRecentViews: () => Promise<void>;
};

const MAX_RECENT = 10;

export const useUserFoodStore = create<UserFoodState>()(
  persist(
    (set, get) => ({
      favorites: [],
      recentViews: [],
      hydrateFromServer: async () => {
        try {
          const [favoritesData, historyData] = await Promise.all([fetchFavorites(), fetchHistory(MAX_RECENT)]);
          set({
            favorites: favoritesData.list.map((item) => ({ dishId: item.dishId, dishName: item.dishName })),
            recentViews: historyData.list.map((item) => ({
              dishId: item.dishId,
              dishName: item.dishName,
              viewedAt: item.viewedAt,
              difficulty: item.difficulty,
            })),
          });
        } catch {
          // keep local cache when remote service is unavailable
        }
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
        recentViews: state.recentViews,
      }),
    }
  )
);
