import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { DishSection } from "../features/dish/components/DishSection";
import { ProfileSection } from "../features/profile/components/ProfileSection";
import { RecommendSection } from "../features/recommend/components/RecommendSection";
import { RecipeDetailPage } from "./RecipeDetailPage";
import { useUserFoodStore } from "../store/userFoodStore";

type TabKey = "recommend" | "dish" | "profile";

export function HomeScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>("recommend");
  const [errorMessage, setErrorMessage] = useState("");
  const [focusDishId, setFocusDishId] = useState<string | null>(null);
  const [detailDishId, setDetailDishId] = useState<string | null>(null);
  const favorites = useUserFoodStore((s) => s.favorites) ?? [];
  const recentViews = useUserFoodStore((s) => s.recentViews) ?? [];
  const toggleFavorite = useUserFoodStore((s) => s.toggleFavorite);
  const addRecentView = useUserFoodStore((s) => s.addRecentView);
  const clearRecentViews = useUserFoodStore((s) => s.clearRecentViews);
  const hydrateFromServer = useUserFoodStore((s) => s.hydrateFromServer);
  const favoriteDishIds = favorites.map((item) => item.dishId);

  function openDishFromRecommend(dish: { dishId: string; dishName: string }) {
    setDetailDishId(dish.dishId);
  }

  useEffect(() => {
    void hydrateFromServer();
  }, [hydrateFromServer]);

  if (detailDishId) {
    return (
      <>
        <RecipeDetailPage
          dishId={detailDishId}
          favoriteDishIds={favoriteDishIds}
          onToggleFavorite={toggleFavorite}
          onOpenDish={addRecentView}
          onBack={() => setDetailDishId(null)}
        />
        <StatusBar style="auto" />
      </>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.main}>
        <ScrollView contentContainerStyle={styles.content}>
          {!!errorMessage && <Text style={styles.error}>{errorMessage}</Text>}
          {activeTab === "recommend" && (
            <RecommendSection
              onError={setErrorMessage}
              favoriteDishIds={favoriteDishIds}
              onToggleFavorite={toggleFavorite}
              onOpenDish={openDishFromRecommend}
            />
          )}
          {activeTab === "dish" && (
            <DishSection
              onError={setErrorMessage}
              favoriteDishIds={favoriteDishIds}
              onToggleFavorite={toggleFavorite}
              onOpenDish={addRecentView}
              focusDishId={focusDishId}
            />
          )}
          {activeTab === "profile" && (
            <ProfileSection
              favorites={favorites}
              recentViews={recentViews}
              onGoRecommend={() => setActiveTab("recommend")}
              onOpenDishInDishTab={(dishId) => {
                setFocusDishId(dishId);
                setActiveTab("dish");
              }}
              onOpenDishDetail={(dishId) => setDetailDishId(dishId)}
              onToggleFavorite={toggleFavorite}
              onClearRecentViews={clearRecentViews}
            />
          )}
        </ScrollView>
        <View style={styles.bottomTabBar}>
          <TabButton label="推荐" icon="🍳" active={activeTab === "recommend"} onPress={() => setActiveTab("recommend")} />
          <TabButton label="查菜" icon="🔍" active={activeTab === "dish"} onPress={() => setActiveTab("dish")} />
          <TabButton label="我的" icon="👤" active={activeTab === "profile"} onPress={() => setActiveTab("profile")} />
        </View>
      </View>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

type TabButtonProps = {
  label: string;
  icon: string;
  active: boolean;
  onPress: () => void;
};

function TabButton({ label, icon, active, onPress }: TabButtonProps) {
  return (
    <Pressable style={styles.tabButton} onPress={onPress}>
      <View style={[styles.tabIconWrap, active && styles.tabIconWrapActive]}>
        <Text style={[styles.tabIcon, active && styles.tabIconActive]}>{icon}</Text>
      </View>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },
  main: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24, gap: 12 },
  bottomTabBar: {
    height: 66,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.08)",
    backgroundColor: "#fff",
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 4,
  },
  tabButton: {
    flex: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
  },
  tabIconWrap: {
    borderRadius: 16,
    paddingHorizontal: 9,
    paddingVertical: 2,
  },
  tabIconWrapActive: { backgroundColor: "rgba(255,107,53,0.1)" },
  tabIcon: { fontSize: 20, opacity: 0.55 },
  tabIconActive: { opacity: 1 },
  tabText: { fontSize: 12, color: "#757575" },
  tabTextActive: { color: "#ff6b35" },
  error: {
    color: "#b91c1c",
    fontSize: 12,
    backgroundColor: "#fee2e2",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
});
