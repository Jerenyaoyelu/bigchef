import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

type FavoriteDish = {
  dishId: string;
  dishName: string;
};

type RecentDish = {
  dishId: string;
  dishName: string;
  viewedAt: string;
};

type UserFoodState = {
  favorites: FavoriteDish[];
  recentViews: RecentDish[];
  toggleFavorite: (dish: FavoriteDish) => void;
  addRecentView: (dish: FavoriteDish) => void;
  clearRecentViews: () => void;
};

const MAX_RECENT = 10;

export const useUserFoodStore = create<UserFoodState>()(
  persist(
    (set) => ({
      favorites: [],
      recentViews: [],
      toggleFavorite: (dish) =>
        set((state) => {
          const exists = state.favorites.some((fav) => fav.dishId === dish.dishId);
          if (exists) {
            return { favorites: state.favorites.filter((fav) => fav.dishId !== dish.dishId) };
          }
          return { favorites: [{ dishId: dish.dishId, dishName: dish.dishName }, ...state.favorites] };
        }),
      addRecentView: (dish) =>
        set((state) => {
          const deduped = state.recentViews.filter((item) => item.dishId !== dish.dishId);
          const next: RecentDish[] = [{ ...dish, viewedAt: new Date().toISOString() }, ...deduped];
          return { recentViews: next.slice(0, MAX_RECENT) };
        }),
      clearRecentViews: () => set({ recentViews: [] }),
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
