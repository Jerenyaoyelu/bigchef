import { StatusBar } from "expo-status-bar";
import { ReactNode, useEffect, useState } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { DishSection } from "../features/dish/components/DishSection";
import { ProfileSection } from "../features/profile/components/ProfileSection";
import { RecommendSection } from "../features/recommend/components/RecommendSection";
import { DishDetailPrefetch } from "../types/api";
import { RecipeDetailPage } from "./RecipeDetailPage";
import { useUserFoodStore } from "../store/userFoodStore";

type TabKey = "recommend" | "dish" | "profile";

function TabLayer({ visible, children }: { visible: boolean; children: ReactNode }) {
  return (
    <View
      style={[
        StyleSheet.absoluteFillObject,
        {
          opacity: visible ? 1 : 0,
          zIndex: visible ? 1 : 0,
          pointerEvents: visible ? "auto" : "none",
        },
      ]}
      collapsable={false}
    >
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {children}
      </ScrollView>
    </View>
  );
}

export function HomeScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>("recommend");
  const [errorMessage, setErrorMessage] = useState("");
  const [focusDishId, setFocusDishId] = useState<string | null>(null);
  const [detailDishId, setDetailDishId] = useState<string | null>(null);
  const [detailPrefetch, setDetailPrefetch] = useState<DishDetailPrefetch | null>(null);
  const favorites = useUserFoodStore((s) => s.favorites) ?? [];
  const recentViews = useUserFoodStore((s) => s.recentViews) ?? [];
  const toggleFavorite = useUserFoodStore((s) => s.toggleFavorite);
  const addRecentView = useUserFoodStore((s) => s.addRecentView);
  const clearRecentViews = useUserFoodStore((s) => s.clearRecentViews);
  const hydrateFromServer = useUserFoodStore((s) => s.hydrateFromServer);
  const favoriteDishIds = favorites.map((item) => item.dishId);

  function openDishFromRecommend(dish: DishDetailPrefetch) {
    setDetailPrefetch(dish);
    setDetailDishId(dish.dishId);
  }

  function closeDishDetail() {
    setDetailDishId(null);
    setDetailPrefetch(null);
  }

  useEffect(() => {
    void hydrateFromServer();
  }, [hydrateFromServer]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.main}>
        {!!errorMessage && (
          <View style={styles.errorBanner}>
            <Text style={styles.error}>{errorMessage}</Text>
          </View>
        )}
        <View style={styles.tabStack}>
          <TabLayer visible={activeTab === "recommend"}>
            <RecommendSection
              onError={setErrorMessage}
              favoriteDishIds={favoriteDishIds}
              onToggleFavorite={toggleFavorite}
              onOpenDish={openDishFromRecommend}
            />
          </TabLayer>
          <TabLayer visible={activeTab === "dish"}>
            <DishSection
              onError={setErrorMessage}
              favoriteDishIds={favoriteDishIds}
              onToggleFavorite={toggleFavorite}
              onOpenDish={addRecentView}
              focusDishId={focusDishId}
            />
          </TabLayer>
          <TabLayer visible={activeTab === "profile"}>
            <ProfileSection
              favorites={favorites}
              recentViews={recentViews}
              onGoRecommend={() => setActiveTab("recommend")}
              onOpenDishInDishTab={(dishId) => {
                setFocusDishId(dishId);
                setActiveTab("dish");
              }}
              onOpenDishDetail={(dishId) => {
                setDetailPrefetch(null);
                setDetailDishId(dishId);
              }}
              onToggleFavorite={toggleFavorite}
              onClearRecentViews={clearRecentViews}
            />
          </TabLayer>
        </View>
        {!detailDishId ? (
          <View style={styles.bottomTabBar}>
            <TabButton label="推荐" icon="🍳" active={activeTab === "recommend"} onPress={() => setActiveTab("recommend")} />
            <TabButton label="查菜" icon="🔍" active={activeTab === "dish"} onPress={() => setActiveTab("dish")} />
            <TabButton label="我的" icon="👤" active={activeTab === "profile"} onPress={() => setActiveTab("profile")} />
          </View>
        ) : null}
        {detailDishId ? (
          <View style={styles.detailOverlay}>
            <RecipeDetailPage
              dishId={detailDishId}
              listPreview={detailPrefetch?.dishId === detailDishId ? detailPrefetch : null}
              favoriteDishIds={favoriteDishIds}
              onToggleFavorite={toggleFavorite}
              onOpenDish={addRecentView}
              onBack={closeDishDetail}
            />
          </View>
        ) : null}
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
  main: { flex: 1, position: "relative" },
  errorBanner: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  tabStack: { flex: 1, position: "relative" },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24, gap: 12 },
  detailOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    backgroundColor: "#fff",
    elevation: 24,
  },
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
