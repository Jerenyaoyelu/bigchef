import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { track } from "../../../analytics/tracker";
import { DishResponse } from "../../../types/api";
import { fetchDishById, fetchDishByName, fetchPopularDishes } from "../api/dishApi";
import { CookingStepsCard } from "./CookingStepsCard";
import { VideoTutorialCard } from "./VideoTutorialCard";

type DishSectionProps = {
  onError: (message: string) => void;
  favoriteDishIds: string[];
  onToggleFavorite: (dish: { dishId: string; dishName: string }) => void;
  onOpenDish: (dish: { dishId: string; dishName: string }) => void;
  focusDishId?: string | null;
};

export function DishSection({ onError, favoriteDishIds, onToggleFavorite, onOpenDish, focusDishId }: DishSectionProps) {
  const [dishName, setDishName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DishResponse | null>(null);
  const [isEmptyResult, setIsEmptyResult] = useState(false);
  const [popularDishes, setPopularDishes] = useState<string[]>(["可乐鸡翅", "西红柿炒鸡蛋", "宫保鸡丁", "红烧肉"]);
  const [videoRequestStateByDish, setVideoRequestStateByDish] = useState<Record<string, "idle" | "requested">>({});

  useEffect(() => {
    void (async () => {
      try {
        const data = await fetchPopularDishes();
        if (data.list.length) {
          setPopularDishes(data.list.map((item) => item.dishName));
        }
      } catch {
        setPopularDishes([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (!focusDishId) return;
    void (async () => {
      setLoading(true);
      onError("");
      setIsEmptyResult(false);
      try {
        const data = await fetchDishById(focusDishId);
        setResult(data);
        setDishName(data.dishName);
      } catch (error) {
        if ((error as Error).message.includes("HTTP 404")) {
          setResult(null);
          setIsEmptyResult(true);
          return;
        }
        onError(`菜谱加载失败: ${(error as Error).message}`);
      } finally {
        setLoading(false);
      }
    })();
  }, [focusDishId, onError]);

  function difficultyLabel(level?: number) {
    if (!level || level <= 1) return "简单";
    if (level <= 3) return "中等";
    return "较难";
  }

  async function onSubmit() {
    if (!dishName.trim()) return;
    setLoading(true);
    onError("");
    setIsEmptyResult(false);
    try {
      track("dish_search_submitted", { dishName });
      const data = await fetchDishByName(dishName);
      setResult(data);
      onOpenDish({ dishId: data.dishId, dishName: data.dishName });
      track("dish_result_loaded", { dishId: data.dishId, hasVideos: data.videos.length > 0 });
    } catch (error) {
      setResult(null);
      if ((error as Error).message.includes("HTTP 404")) {
        setIsEmptyResult(true);
      } else {
        onError(`菜谱查询失败: ${(error as Error).message}`);
      }
      track("dish_search_failed", { message: (error as Error).message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerWrap}>
        <Text style={styles.headerTitle}>查找菜谱</Text>
        <Text style={styles.headerDesc}>输入菜名，查看详细做法</Text>
      </View>
      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          value={dishName}
          onChangeText={setDishName}
          style={styles.input}
          placeholder="例如：可乐鸡翅"
          placeholderTextColor="rgba(26,26,26,0.5)"
          returnKeyType="search"
          onSubmitEditing={onSubmit}
        />
      </View>
      <Pressable
        style={[styles.primaryButton, (!dishName.trim() || loading) && styles.buttonDisabled]}
        onPress={onSubmit}
        disabled={!dishName.trim() || loading}
      >
        <Text style={styles.primaryButtonText}>{loading ? "查询中..." : "查询菜谱"}</Text>
      </Pressable>

      {!result && (
        <View style={styles.popularCard}>
          <Text style={styles.popularTitle}>💡 试试这些热门菜</Text>
          <View style={styles.popularRow}>
            {popularDishes.map((item) => (
              <Pressable key={item} style={styles.popularChip} onPress={() => setDishName(item)}>
                <Text style={styles.popularChipText}>{item}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {isEmptyResult && (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>暂未收录该菜谱</Text>
          <Text style={styles.emptyDesc}>当前版本仅展示已入库菜谱，后续会接入 AI 自动生成并入库。</Text>
        </View>
      )}

      {result && (
        <View style={styles.resultWrap}>
          <View style={styles.infoCard}>
            <View style={styles.resultHead}>
              <View>
                <Text style={styles.resultTitle}>{result.dishName}</Text>
                <View style={styles.resultMetaRow}>
                  <Text style={styles.resultMetaItem}>◷ {result.cookTimeMinutes ?? 20}分钟</Text>
                  <Text style={styles.resultMetaItem}>👨‍🍳 {difficultyLabel(result.difficulty)}</Text>
                </View>
              </View>
              <Pressable onPress={() => onToggleFavorite({ dishId: result.dishId, dishName: result.dishName })} hitSlop={6}>
                <Text style={[styles.favoriteText, favoriteDishIds.includes(result.dishId) && styles.favoriteTextActive]}>
                  {favoriteDishIds.includes(result.dishId) ? "♥" : "♡"}
                </Text>
              </Pressable>
            </View>
          </View>

          <VideoTutorialCard
            hasVideo={result.videos.length > 0}
            requestState={videoRequestStateByDish[result.dishId] ?? "idle"}
            onWatchVideo={() => {
              if (!result.videos.length) return;
              track("dish_video_clicked", { dishId: result.dishId, url: result.videos[0].url });
            }}
            onRequestVideo={() => {
              setVideoRequestStateByDish((prev) => ({ ...prev, [result.dishId]: "requested" }));
              track("video_request_update_click", { dishId: result.dishId, source: "dish_detail" });
            }}
          />

          <IngredientCard title="所需食材" sections={result.ingredients} />
          <CookingStepsCard steps={result.stepsSummary} />
        </View>
      )}
    </View>
  );
}

type IngredientCardProps = {
  title: string;
  sections: DishResponse["ingredients"];
};

function IngredientCard({ title, sections }: IngredientCardProps) {
  return (
    <View style={styles.ingredientCard}>
      <Text style={styles.ingredientTitle}>{title}</Text>
      <IngredientGroup label="主料" items={sections.main} tone="main" />
      <IngredientGroup label="辅料" items={sections.secondary} tone="secondary" />
      <IngredientGroup label="调味料" items={sections.seasoning} tone="seasoning" />
    </View>
  );
}

type IngredientGroupProps = {
  label: string;
  items: string[];
  tone: "main" | "secondary" | "seasoning";
};

function IngredientGroup({ label, items, tone }: IngredientGroupProps) {
  return (
    <View style={styles.groupWrap}>
      <Text style={styles.groupLabel}>{label}</Text>
      <View style={styles.groupChipWrap}>
        {items.map((item) => (
          <View
            key={`${label}-${item}`}
            style={[
              styles.groupChip,
              tone === "main" && styles.mainChip,
              tone === "secondary" && styles.secondaryChip,
              tone === "seasoning" && styles.seasoningChip,
            ]}
          >
            <Text
              style={[
                styles.groupChipText,
                tone === "main" && styles.mainChipText,
                tone === "secondary" && styles.secondaryChipText,
                tone === "seasoning" && styles.seasoningChipText,
              ]}
            >
              {item}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  headerWrap: { gap: 6 },
  headerTitle: { fontSize: 24, color: "#1a1a1a", fontWeight: "600" },
  headerDesc: { fontSize: 16, color: "#757575" },
  searchBox: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 10,
  },
  searchIcon: { fontSize: 20, color: "#757575", opacity: 0.8 },
  input: { flex: 1, fontSize: 16, color: "#1a1a1a", paddingVertical: 0 },
  primaryButton: {
    backgroundColor: "#ff6b35",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    shadowColor: "#ff6b35",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  primaryButtonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  buttonDisabled: { opacity: 0.5 },
  popularCard: {
    backgroundColor: "rgba(78,205,196,0.1)",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  popularTitle: { color: "rgba(255,255,255,0.8)", fontSize: 14 },
  popularRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  popularChip: { backgroundColor: "#4ecdc4", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  popularChipText: { color: "#fff", fontSize: 12, fontWeight: "500" },
  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 6,
  },
  emptyTitle: { color: "#1a1a1a", fontSize: 16, fontWeight: "600" },
  emptyDesc: { color: "#757575", fontSize: 14, lineHeight: 22 },
  resultWrap: { gap: 12 },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  resultHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  resultTitle: { fontSize: 19, fontWeight: "600", color: "#1a1a1a" },
  resultMetaRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  resultMetaItem: { fontSize: 13, color: "#757575" },
  favoriteText: { fontSize: 21, color: "#757575" },
  favoriteTextActive: { color: "#ff6b35" },
  ingredientCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 12,
  },
  ingredientTitle: { fontSize: 18, color: "#1a1a1a", fontWeight: "600" },
  groupWrap: { gap: 8 },
  groupLabel: { fontSize: 14, color: "#757575" },
  groupChipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  groupChip: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 7 },
  groupChipText: { fontSize: 14 },
  mainChip: { backgroundColor: "rgba(255,107,53,0.1)" },
  mainChipText: { color: "#ff6b35" },
  secondaryChip: { backgroundColor: "rgba(78,205,196,0.1)" },
  secondaryChipText: { color: "#4ecdc4" },
  seasoningChip: { backgroundColor: "#f5f5f5" },
  seasoningChipText: { color: "#1a1a1a" },
});

