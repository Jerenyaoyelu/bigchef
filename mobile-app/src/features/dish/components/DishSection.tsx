import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { track } from "../../../analytics/tracker";
import { DishResponse } from "../../../types/api";
import { fetchDishById, fetchDishByName, fetchPopularDishes } from "../api/dishApi";
import { fetchRecommendByIngredients } from "../../recommend/api/recommendApi";
import { CookingStepsCard } from "./CookingStepsCard";
import { VideoTutorialCard } from "./VideoTutorialCard";

type DishSectionProps = {
  onError: (message: string) => void;
  favoriteDishIds: string[];
  onToggleFavorite: (dish: { dishId: string; dishName: string }) => void;
  onOpenDish: (dish: { dishId: string; dishName: string }) => void;
  focusDishId?: string | null;
  onRequireLogin?: () => boolean;
};

export function DishSection({ onError, favoriteDishIds, onToggleFavorite, onOpenDish, focusDishId, onRequireLogin }: DishSectionProps) {
  const [dishName, setDishName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DishResponse | null>(null);
  const [isEmptyResult, setIsEmptyResult] = useState(false);
  const [popularDishes, setPopularDishes] = useState<string[]>(["可乐鸡翅", "西红柿炒鸡蛋", "宫保鸡丁", "红烧肉"]);
  const [videoRequestStateByDish, setVideoRequestStateByDish] = useState<Record<string, "idle" | "requested">>({});
  const [aiSearching, setAiSearching] = useState(false);
  const [aiResult, setAiResult] = useState<{ dishName: string; matchScore: number; cookTimeMinutes: number; source: string } | null>(null);

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

  const canReset = Boolean(dishName.trim()) || result !== null || isEmptyResult;

  function resetDishSearch() {
    setDishName("");
    setResult(null);
    setIsEmptyResult(false);
    setLoading(false);
    setVideoRequestStateByDish({});
    onError("");
    track("dish_search_reset");
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

  async function onAiSearch() {
    if (!dishName.trim()) return;
    if (onRequireLogin && !onRequireLogin()) return;
    setAiSearching(true);
    onError("");
    try {
      track("dish_ai_search_submitted", { dishName });
      const data = await fetchRecommendByIngredients([dishName.trim()], { aiBoost: true });
      if (data.list.length > 0) {
        const best = data.list[0]!;
        setAiResult({
          dishName: best.dishName,
          matchScore: best.matchScore,
          cookTimeMinutes: best.cookTimeMinutes,
          source: data.source ?? "ai",
        });
        track("dish_ai_search_result", { total: data.total, source: data.source });
      } else {
        setAiResult(null);
        onError("AI 暂未找到相关菜谱");
      }
    } catch (error) {
      onError(`AI 搜索失败: ${(error as Error).message}`);
    } finally {
      setAiSearching(false);
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
      <Pressable
        style={[styles.aiButton, (!dishName.trim() || aiSearching) && styles.buttonDisabled]}
        onPress={onAiSearch}
        disabled={!dishName.trim() || aiSearching}
      >
        <Text style={styles.aiButtonText}>{aiSearching ? "AI 搜索中..." : "✨ AI 智能搜索"}</Text>
      </Pressable>
      {canReset ? (
        <Pressable style={styles.resetButton} onPress={resetDishSearch} hitSlop={8}>
          <Text style={styles.resetButtonText}>重置查询</Text>
        </Pressable>
      ) : null}

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
          <Text style={styles.emptyDesc}>试试「AI 智能搜索」，让 AI 为你生成菜谱。</Text>
        </View>
      )}

      {aiResult && (
        <View style={styles.aiResultCard}>
          <View style={styles.aiResultBadge}>
            <Text style={styles.aiResultBadgeText}>AI 推荐</Text>
          </View>
          <Text style={styles.aiResultDishName}>{aiResult.dishName}</Text>
          <View style={styles.aiResultMeta}>
            <Text style={styles.aiResultMetaText}>◷ {aiResult.cookTimeMinutes}分钟</Text>
            <Text style={styles.aiResultMetaText}>匹配度 {Math.round(aiResult.matchScore * 100)}%</Text>
            <Text style={styles.aiResultMetaText}>来源: {aiResult.source}</Text>
          </View>
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
  aiButton: {
    backgroundColor: "#7c3aed",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    shadowColor: "#7c3aed",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  aiButtonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  aiResultCard: {
    backgroundColor: "#f3e8ff",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  aiResultBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#7c3aed",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  aiResultBadgeText: { color: "#fff", fontSize: 11, fontWeight: "600" },
  aiResultDishName: { fontSize: 18, fontWeight: "600", color: "#1a1a1a" },
  aiResultMeta: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  aiResultMetaText: { fontSize: 13, color: "#6b21a8" },
  buttonDisabled: { opacity: 0.5 },
  resetButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    backgroundColor: "#fff",
  },
  resetButtonText: { color: "#757575", fontSize: 14, fontWeight: "500" },
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

