import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { DishSection } from "../features/dish/components/DishSection";
import { RecommendSection } from "../features/recommend/components/RecommendSection";
import { useUserFoodStore } from "../store/userFoodStore";

type TabKey = "recommend" | "dish" | "profile";

export function HomeScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>("recommend");
  const [errorMessage, setErrorMessage] = useState("");
  const favorites = useUserFoodStore((s) => s.favorites) ?? [];
  const recentViews = useUserFoodStore((s) => s.recentViews) ?? [];
  const toggleFavorite = useUserFoodStore((s) => s.toggleFavorite);
  const addRecentView = useUserFoodStore((s) => s.addRecentView);
  const clearRecentViews = useUserFoodStore((s) => s.clearRecentViews);
  const favoriteDishIds = favorites.map((item) => item.dishId);

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
            <View style={styles.profilePage}>
              <View style={styles.profileHeader}>
                <Text style={styles.profileTitle}>我的</Text>
                <Text style={styles.profileSubtitle}>管理你的收藏和浏览历史</Text>
              </View>

              <View style={styles.statsRow}>
                <View style={[styles.statsCard, styles.statsCardFavorite]}>
                  <Text style={styles.statsIcon}>♡</Text>
                  <Text style={styles.statsNumber}>{favorites.length}</Text>
                  <Text style={styles.statsLabel}>收藏菜谱</Text>
                </View>
                <View style={[styles.statsCard, styles.statsCardHistory]}>
                  <Text style={styles.statsIcon}>🕒</Text>
                  <Text style={styles.statsNumber}>{recentViews.length}</Text>
                  <Text style={styles.statsLabel}>浏览历史</Text>
                </View>
              </View>

              <View style={styles.sectionWrap}>
                <Text style={styles.sectionTitle}>我的收藏</Text>
                {!favorites.length ? (
                  <View style={styles.favoriteEmptyWrap}>
                    <View style={styles.favoriteEmptyIconWrap}>
                      <Text style={styles.favoriteEmptyIcon}>♡</Text>
                    </View>
                    <Text style={styles.favoriteEmptyTitle}>还没有收藏</Text>
                    <Text style={styles.favoriteEmptyDesc}>去推荐页或查菜页收藏喜欢的菜谱吧</Text>
                    <Pressable style={styles.goRecommendButton} onPress={() => setActiveTab("recommend")}>
                      <Text style={styles.goRecommendText}>去推荐页</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.favoritesList}>
                    {favorites.map((item) => (
                      <View key={item.dishId} style={styles.favoriteCard}>
                        <Text style={styles.favoriteName}>{item.dishName}</Text>
                        <Pressable style={styles.favoriteRemove} onPress={() => toggleFavorite(item)}>
                          <Text style={styles.favoriteRemoveText}>移除</Text>
                        </Pressable>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.sectionWrap}>
                <View style={styles.historyHeader}>
                  <Text style={styles.sectionTitle}>浏览历史</Text>
                  {!!recentViews.length && (
                    <Pressable onPress={clearRecentViews}>
                      <Text style={styles.clearText}>清空历史</Text>
                    </Pressable>
                  )}
                </View>
                {!recentViews.length && <Text style={styles.emptyHistoryText}>暂无浏览记录</Text>}
                {!!recentViews.length && (
                  <View style={styles.historyList}>
                    {recentViews.map((item) => (
                      <View key={`${item.dishId}-${item.viewedAt}`} style={styles.historyCard}>
                        <View style={styles.historyMain}>
                          <Text style={styles.historyDish}>{item.dishName}</Text>
                          <Text style={styles.historyTime}>◷ {formatRelativeMinutes(item.viewedAt)}</Text>
                        </View>
                        <View style={styles.historyTag}>
                          <Text style={styles.historyTagText}>简单</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.tipCard}>
                <View style={styles.tipIconWrap}>
                  <Text style={styles.tipIcon}>🍳</Text>
                </View>
                <View style={styles.tipContent}>
                  <Text style={styles.tipTitle}>烹饪小贴士</Text>
                  <Text style={styles.tipDesc}>收藏你喜欢的菜谱，随时查看详细步骤，让做饭变得更简单！</Text>
                </View>
              </View>
            </View>
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

function formatRelativeMinutes(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minute = Math.max(1, Math.floor(diff / 60000));
  if (minute < 60) return `${minute}分钟前`;
  const hour = Math.floor(minute / 60);
  if (hour < 24) return `${hour}小时前`;
  const day = Math.floor(hour / 24);
  return `${day}天前`;
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
  profilePage: {
    gap: 10,
  },
  profileHeader: { gap: 5, marginBottom: 2 },
  profileTitle: { fontSize: 36 / 1.5, color: "#1a1a1a", fontWeight: "600" },
  profileSubtitle: { fontSize: 16, color: "#757575" },
  statsRow: { flexDirection: "row", gap: 10 },
  statsCard: {
    flex: 1,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    minHeight: 128,
    justifyContent: "space-between",
  },
  statsCardFavorite: { backgroundColor: "#ff6b35" },
  statsCardHistory: { backgroundColor: "#4ecdc4" },
  statsIcon: { fontSize: 28, color: "#fff" },
  statsNumber: { fontSize: 40 / 1.5, color: "#fff", marginTop: 2 },
  statsLabel: { fontSize: 14, color: "rgba(255,255,255,0.85)" },
  sectionWrap: { marginTop: 8, gap: 10 },
  sectionTitle: { fontSize: 27 / 1.5, color: "#1a1a1a", fontWeight: "600" },
  favoriteEmptyWrap: {
    alignItems: "center",
    paddingVertical: 14,
    gap: 10,
  },
  favoriteEmptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 999,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
  },
  favoriteEmptyIcon: { fontSize: 40 / 1.5, color: "#757575" },
  favoriteEmptyTitle: { fontSize: 18, color: "#1a1a1a", fontWeight: "600" },
  favoriteEmptyDesc: { fontSize: 14, color: "#757575" },
  goRecommendButton: {
    backgroundColor: "#ff6b35",
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 11,
  },
  goRecommendText: { color: "#fff", fontSize: 16, fontWeight: "500" },
  favoritesList: { gap: 10 },
  favoriteCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  favoriteName: { fontSize: 16, color: "#1a1a1a", fontWeight: "500", flex: 1 },
  favoriteRemove: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  favoriteRemoveText: { color: "#757575", fontSize: 12 },
  historyHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  clearText: { color: "#ff6b6b", fontSize: 14, fontWeight: "500" },
  emptyHistoryText: { color: "#9ca3af", fontSize: 13 },
  historyList: { gap: 10 },
  historyCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  historyMain: { gap: 4, flex: 1 },
  historyDish: { color: "#1a1a1a", fontSize: 16, fontWeight: "500" },
  historyTime: { color: "#757575", fontSize: 12 },
  historyTag: { backgroundColor: "#f5f5f5", borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4 },
  historyTagText: { color: "#757575", fontSize: 12 },
  tipCard: {
    marginTop: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,184,77,0.25)",
    backgroundColor: "#fff3e0",
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  tipIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: "#ff6b35",
    alignItems: "center",
    justifyContent: "center",
  },
  tipIcon: { fontSize: 20, color: "#fff" },
  tipContent: { flex: 1, gap: 3 },
  tipTitle: { color: "#ff6b35", fontSize: 22 / 1.5, fontWeight: "600" },
  tipDesc: { color: "rgba(255,107,53,0.9)", fontSize: 14, lineHeight: 22 },
});

