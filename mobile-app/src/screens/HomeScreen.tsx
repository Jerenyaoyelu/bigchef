import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { APP_CONFIG } from "../config/env";
import { DishSection } from "../features/dish/components/DishSection";
import { RecommendSection } from "../features/recommend/components/RecommendSection";
import { useAppConfigStore } from "../store/appConfigStore";
import { useUserFoodStore } from "../store/userFoodStore";

type TabKey = "recommend" | "dish" | "profile";

export function HomeScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>("recommend");
  const [errorMessage, setErrorMessage] = useState("");
  const apiBaseUrl = useAppConfigStore((s) => s.apiBaseUrl);
  const favorites = useUserFoodStore((s) => s.favorites) ?? [];
  const recentViews = useUserFoodStore((s) => s.recentViews) ?? [];
  const toggleFavorite = useUserFoodStore((s) => s.toggleFavorite);
  const addRecentView = useUserFoodStore((s) => s.addRecentView);
  const clearRecentViews = useUserFoodStore((s) => s.clearRecentViews);
  const favoriteDishIds = favorites.map((item) => item.dishId);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>今天吃什么？</Text>
          <Text style={styles.heroSubtitle}>用现有食材找菜，或直接搜菜名获取步骤，降低每天做饭决策成本。</Text>
          <View style={styles.heroMetaWrap}>
            <Text style={styles.heroMeta}>API: {apiBaseUrl}</Text>
            {!APP_CONFIG.isDev && <Text style={styles.heroMeta}>当前非开发环境，地址由构建变量注入</Text>}
          </View>
        </View>
        <View style={styles.tabRow}>
          <TabButton label="推荐" active={activeTab === "recommend"} onPress={() => setActiveTab("recommend")} />
          <TabButton label="查菜" active={activeTab === "dish"} onPress={() => setActiveTab("dish")} />
          <TabButton label="我的" active={activeTab === "profile"} onPress={() => setActiveTab("profile")} />
        </View>
        {!!errorMessage && <Text style={styles.error}>{errorMessage}</Text>}
        {activeTab === "recommend" && (
          <RecommendSection
            onError={setErrorMessage}
            favoriteDishIds={favoriteDishIds}
            onToggleFavorite={toggleFavorite}
            onOpenDish={addRecentView}
          />
        )}
        {activeTab === "dish" && (
          <DishSection
            onError={setErrorMessage}
            favoriteDishIds={favoriteDishIds}
            onToggleFavorite={toggleFavorite}
            onOpenDish={addRecentView}
          />
        )}
        {activeTab === "profile" && (
          <View style={styles.profileCard}>
            <Text style={styles.profileTitle}>我的菜谱空间</Text>
            <Text style={styles.profileSubtitle}>收藏 {favorites.length} 道菜，最近浏览 {recentViews.length} 条记录</Text>
            <Text style={styles.groupTitle}>收藏菜谱</Text>
            {!favorites.length && <Text style={styles.emptyText}>还没有收藏，去推荐页或查菜页收藏你喜欢的菜吧。</Text>}
            {favorites.map((item) => (
              <View key={item.dishId} style={styles.listItem}>
                <Text style={styles.listText}>{item.dishName}</Text>
                <Pressable style={styles.listAction} onPress={() => toggleFavorite(item)}>
                  <Text style={styles.listActionText}>移除</Text>
                </Pressable>
              </View>
            ))}
            <Text style={styles.groupTitle}>最近浏览</Text>
            {!recentViews.length && <Text style={styles.emptyText}>还没有浏览记录，查一次菜谱就会出现在这里。</Text>}
            {recentViews.map((item) => (
              <View key={`${item.dishId}-${item.viewedAt}`} style={styles.listItem}>
                <Text style={styles.listText}>{item.dishName}</Text>
                <Text style={styles.timeText}>{new Date(item.viewedAt).toLocaleString()}</Text>
              </View>
            ))}
            {!!recentViews.length && (
              <Pressable style={styles.clearButton} onPress={clearRecentViews}>
                <Text style={styles.clearButtonText}>清空最近浏览</Text>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

type TabButtonProps = {
  label: string;
  active: boolean;
  onPress: () => void;
};

function TabButton({ label, active, onPress }: TabButtonProps) {
  return (
    <Pressable style={[styles.tabButton, active && styles.tabButtonActive]} onPress={onPress}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f6fb" },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 28, gap: 12 },
  heroCard: {
    backgroundColor: "#1f6feb",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 8,
    shadowColor: "#1f6feb",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  heroTitle: { fontSize: 24, fontWeight: "800", color: "#ffffff" },
  heroSubtitle: { fontSize: 13, color: "#dbeafe", lineHeight: 20 },
  heroMetaWrap: { marginTop: 4, gap: 2 },
  heroMeta: { fontSize: 11, color: "#dbeafe" },
  tabRow: { flexDirection: "row", gap: 8 },
  tabButton: {
    flex: 1,
    backgroundColor: "#e9eef6",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  tabButtonActive: { backgroundColor: "#1f6feb" },
  tabText: { fontSize: 13, fontWeight: "600", color: "#47607f" },
  tabTextActive: { color: "#ffffff" },
  error: {
    color: "#b91c1c",
    fontSize: 12,
    backgroundColor: "#fee2e2",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  profileCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#e8edf3",
    gap: 10,
  },
  profileTitle: { fontSize: 18, fontWeight: "800", color: "#13233a" },
  profileSubtitle: { fontSize: 12, color: "#5f6f82" },
  groupTitle: { fontSize: 13, fontWeight: "700", color: "#334155", marginTop: 4 },
  emptyText: { fontSize: 12, color: "#738396" },
  listItem: {
    backgroundColor: "#f8fbff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#dde7f3",
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  listText: { fontSize: 13, color: "#1e293b", flex: 1, fontWeight: "600" },
  timeText: { fontSize: 11, color: "#64748b" },
  listAction: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#eaf2ff",
  },
  listActionText: { color: "#174ea6", fontSize: 11, fontWeight: "700" },
  clearButton: {
    marginTop: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#f1b9b9",
    backgroundColor: "#fff5f5",
    alignItems: "center",
    paddingVertical: 10,
  },
  clearButtonText: { color: "#b42318", fontSize: 12, fontWeight: "700" },
});

