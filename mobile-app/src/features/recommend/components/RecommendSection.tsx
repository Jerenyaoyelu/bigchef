import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { track } from "../../../analytics/tracker";
import { DishDetailPrefetch, MissingIngredientItem, RecommendItem, RecommendResponse } from "../../../types/api";
import { fetchRecommendByIngredients } from "../api/recommendApi";

type RecommendSectionProps = {
  onError: (message: string) => void;
  favoriteDishIds: string[];
  onToggleFavorite: (dish: { dishId: string; dishName: string }) => void;
  onOpenDish: (dish: DishDetailPrefetch) => void;
};

export function RecommendSection({ onError, favoriteDishIds, onToggleFavorite, onOpenDish }: RecommendSectionProps) {
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RecommendResponse | null>(null);
  const [searched, setSearched] = useState(false);
  const [sortMode, setSortMode] = useState<"match" | "missing" | "time">("match");
  const [aiBoostState, setAiBoostState] = useState<"idle" | "loading" | "done">("idle");
  /** 混合结果时：先展示 AI；仅 mixed 时使用 */
  const [resultListTab, setResultListTab] = useState<"ai" | "library">("ai");
  const commonIngredients = ["鸡蛋", "西红柿", "土豆", "鸡肉", "猪肉", "牛肉", "白菜", "豆腐", "葱", "姜", "蒜", "青椒"];

  function partitionMissingByRole(items: MissingIngredientItem[]) {
    const main = items.filter((i) => i.role === "main").map((i) => i.name);
    const secondary = items.filter((i) => i.role === "secondary").map((i) => i.name);
    return { main, secondary };
  }

  function listEntryOrigin(item: RecommendItem): "db" | "ai" {
    if (item.entrySource === "db" || item.entrySource === "ai") return item.entrySource;
    return result?.source === "db" ? "db" : "ai";
  }

  const compareRecommendItems = (a: RecommendItem, b: RecommendItem) => {
    if (sortMode === "missing") return a.missingIngredients.length - b.missingIngredients.length;
    if (sortMode === "time") return a.cookTimeMinutes - b.cookTimeMinutes;
    return b.matchScore - a.matchScore;
  };

  const sortedList = useMemo(() => {
    const list = result?.list ?? [];
    return [...list].sort(compareRecommendItems);
  }, [result?.list, sortMode]);

  const isMixedResult = result?.source === "mixed";

  const sortedAiList = useMemo(() => {
    const list = (result?.list ?? []).filter((i) => listEntryOrigin(i) === "ai");
    return [...list].sort(compareRecommendItems);
  }, [result?.list, result?.source, sortMode]);

  const sortedLibraryList = useMemo(() => {
    const list = (result?.list ?? []).filter((i) => listEntryOrigin(i) === "db");
    return [...list].sort(compareRecommendItems);
  }, [result?.list, result?.source, sortMode]);

  const displayList = isMixedResult
    ? resultListTab === "ai"
      ? sortedAiList
      : sortedLibraryList
    : sortedList;

  function addIngredient(value: string) {
    const normalized = value.trim();
    if (!normalized) return;
    setIngredients((prev) => {
      if (prev.includes(normalized)) return prev;
      return [...prev, normalized];
    });
  }

  function removeIngredient(target: string) {
    setIngredients((prev) => prev.filter((item) => item !== target));
  }

  function toggleIngredient(item: string) {
    if (ingredients.includes(item)) {
      removeIngredient(item);
      return;
    }
    addIngredient(item);
  }

  function addInputIngredient() {
    addIngredient(inputValue);
    setInputValue("");
  }

  function mapDifficulty(level: number) {
    if (level <= 1) return "简单";
    if (level <= 3) return "中等";
    return "较难";
  }

  async function onSubmit() {
    if (!ingredients.length) return;
    setLoading(true);
    setSearched(true);
    setAiBoostState("idle");
    onError("");
    try {
      track("recommend_search_submitted", { ingredients });
      const data = await fetchRecommendByIngredients(ingredients);
      setResult(data);
      track("recommend_result_loaded", { total: data.total });
    } catch (error) {
      onError(`推荐查询失败: ${(error as Error).message}`);
      track("recommend_search_failed", { message: (error as Error).message });
    } finally {
      setLoading(false);
    }
  }

  const canReset = ingredients.length > 0 || searched || !!result || inputValue.trim().length > 0;

  function resetRecommendState() {
    setIngredients([]);
    setInputValue("");
    setLoading(false);
    setResult(null);
    setSearched(false);
    setSortMode("match");
    setAiBoostState("idle");
    setResultListTab("ai");
    onError("");
    track("recommend_reset");
  }

  async function onAiBoost() {
    if (!result?.list?.length || !ingredients.length || aiBoostState === "loading") return;
    setAiBoostState("loading");
    track("ai_recommend_triggered_manual", { total: result.total });
    onError("");
    try {
      const data = await fetchRecommendByIngredients(ingredients, { aiBoost: true });
      setResult(data);
      const aiFailed =
        data.aiMeta?.triggeredBy === "manual_ai_boost_failed" || data.aiMeta?.triggeredBy === "db_miss_failed";
      if (aiFailed) {
        setAiBoostState("idle");
        onError("AI 暂时无法生成新菜谱，已为你保留当前推荐结果。");
        track("ai_recommend_boost_failed", { reason: data.aiMeta?.triggeredBy });
        return;
      }
      if (data.source === "ai_generated" || data.source === "mixed") {
        setAiBoostState("done");
        if (data.source === "mixed") setResultListTab("ai");
        track("ai_recommend_boost_loaded", { total: data.total, source: data.source });
        if (data.aiMeta?.generationSaved) {
          track("ai_generation_saved", { scene: "recommend_ai_boost" });
        }
      } else {
        setAiBoostState("idle");
      }
    } catch (error) {
      setAiBoostState("idle");
      onError(`AI 推荐失败: ${(error as Error).message}`);
      track("ai_recommend_boost_failed", { message: (error as Error).message });
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.heroCard}>
        <Text style={styles.heroSmallTitle}>✨ 今天吃什么？</Text>
        <Text style={styles.heroTitle}>告诉我你有什么食材</Text>
        <Text style={styles.heroSubtitle}>BigChef 帮你快速找到匹配的美味菜谱</Text>
      </View>

      <View style={styles.inputCard}>
        <View style={styles.ingredientInputBox}>
          <View style={styles.selectedRow}>
            {ingredients.map((item) => (
              <View key={item} style={styles.selectedChip}>
                <Text style={styles.selectedChipText}>{item}</Text>
                <Pressable onPress={() => removeIngredient(item)} hitSlop={6}>
                  <Text style={styles.selectedChipRemove}>×</Text>
                </Pressable>
              </View>
            ))}
            <TextInput
              value={inputValue}
              onChangeText={setInputValue}
              style={styles.textInput}
              placeholder={ingredients.length ? "" : "输入食材后按回车添加"}
              placeholderTextColor="#9ca3af"
              onSubmitEditing={addInputIngredient}
              returnKeyType="done"
            />
          </View>
        </View>

        <Text style={styles.quickLabel}>常用食材（点击快速添加）</Text>
        <View style={styles.quickWrap}>
          {commonIngredients.map((item) => {
            const active = ingredients.includes(item);
            return (
              <Pressable
                key={item}
                style={[styles.quickChip, active && styles.quickChipActive]}
                onPress={() => toggleIngredient(item)}
              >
                <Text style={styles.quickPlus}>{active ? "×" : "+"}</Text>
                <Text style={styles.quickChipText}>{item}</Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable
          style={[styles.primaryButton, (!ingredients.length || loading) && styles.buttonDisabled]}
          onPress={onSubmit}
          disabled={!ingredients.length || loading}
        >
          <Text style={styles.primaryButtonText}>{loading ? "查询中..." : "查询推荐"}</Text>
        </Pressable>
        {canReset ? (
          <Pressable style={styles.resetButton} onPress={resetRecommendState} hitSlop={8}>
            <Text style={styles.resetButtonText}>重置查询</Text>
          </Pressable>
        ) : null}
      </View>

      {!searched && !result?.list?.length && (
        <View style={styles.tipCard}>
          <Text style={styles.tipTitle}>💡 小提示</Text>
          <Text style={styles.tipDesc}>添加你现有的食材，可以手动输入或点击下方常用食材。我们会为你推荐最匹配的菜谱！</Text>
        </View>
      )}

      {searched && !loading && result?.total === 0 && (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>暂无匹配菜谱</Text>
          <Text style={styles.emptyDesc}>当前食材没有匹配结果，后续版本会支持 AI 生成新菜谱。</Text>
        </View>
      )}

      {!!result?.list?.length && (
        <View style={styles.resultSection}>
          <View style={styles.resultHeadRow}>
            <Text style={styles.resultCount}>
              {isMixedResult
                ? `共 ${result.list.length} 道（AI ${sortedAiList.length} · 菜谱库 ${sortedLibraryList.length}）`
                : `找到 ${sortedList.length} 个匹配菜谱`}
            </Text>
            {aiBoostState === "idle" && (
              <Pressable style={styles.aiBoostButton} onPress={onAiBoost}>
                <Text style={styles.aiBoostIcon}>✧</Text>
                <Text style={styles.aiBoostText}>AI 帮我再推荐</Text>
              </Pressable>
            )}
            {aiBoostState === "done" && (
              <View style={styles.aiBoostDoneBadge}>
                <Text style={styles.aiBoostIcon}>✧</Text>
                <Text style={styles.aiBoostDoneText}>已使用 AI 增强</Text>
              </View>
            )}
          </View>
          {isMixedResult ? (
            <View style={styles.subTabRow}>
              <Pressable
                style={[styles.subTab, resultListTab === "ai" && styles.subTabActive]}
                onPress={() => setResultListTab("ai")}
              >
                <Text style={[styles.subTabText, resultListTab === "ai" && styles.subTabTextActive]}>
                  AI 推荐 ({sortedAiList.length})
                </Text>
              </Pressable>
              <Pressable
                style={[styles.subTab, resultListTab === "library" && styles.subTabActive]}
                onPress={() => setResultListTab("library")}
              >
                <Text style={[styles.subTabText, resultListTab === "library" && styles.subTabTextActive]}>
                  菜谱库 ({sortedLibraryList.length})
                </Text>
              </Pressable>
            </View>
          ) : null}
          <View style={styles.sortRow}>
            <Pressable style={[styles.sortButton, sortMode === "match" && styles.sortButtonActive]} onPress={() => setSortMode("match")}>
              <Text style={[styles.sortButtonText, sortMode === "match" && styles.sortButtonTextActive]}>匹配优先</Text>
            </Pressable>
            <Pressable style={[styles.sortButton, sortMode === "missing" && styles.sortButtonActive]} onPress={() => setSortMode("missing")}>
              <Text style={[styles.sortButtonText, sortMode === "missing" && styles.sortButtonTextActive]}>缺料最少</Text>
            </Pressable>
            <Pressable style={[styles.sortButton, sortMode === "time" && styles.sortButtonActive]} onPress={() => setSortMode("time")}>
              <Text style={[styles.sortButtonText, sortMode === "time" && styles.sortButtonTextActive]}>耗时最短</Text>
            </Pressable>
          </View>
        </View>
      )}

      {!!result?.list?.length && aiBoostState === "loading" && (
        <View style={styles.aiLoadingCard}>
          <ActivityIndicator size="large" color="#ff6b35" />
          <Text style={styles.aiLoadingText}>AI 正在为你生成更多推荐...</Text>
        </View>
      )}

      {aiBoostState !== "loading" &&
        displayList.map((item) => {
          const { main: missingMainNames, secondary: missingSecondaryNames } = partitionMissingByRole(item.missingIngredients);
          return (
          <View key={item.dishId} style={styles.resultCard}>
            <View style={styles.resultHead}>
              <Text style={styles.resultTitle}>{item.dishName}</Text>
              <Pressable
                onPress={() => onToggleFavorite({ dishId: item.dishId, dishName: item.dishName })}
                hitSlop={6}
                style={styles.favoriteButton}
              >
                <Text style={[styles.favoriteText, favoriteDishIds.includes(item.dishId) && styles.favoriteTextActive]}>
                  {favoriteDishIds.includes(item.dishId) ? "♥" : "♡"}
                </Text>
              </Pressable>
            </View>
            <Text style={styles.matchText}>↗ 匹配度 {(item.matchScore * 100).toFixed(0)}%</Text>
            {!isMixedResult ? (
              <View style={styles.aiTagRow}>
                {listEntryOrigin(item) === "ai" ? (
                  <View style={styles.aiTag}>
                    <Text style={styles.aiTagIcon}>✧</Text>
                    <Text style={styles.aiTagText}>AI 生成</Text>
                  </View>
                ) : (
                  <View style={styles.dbTag}>
                    <Text style={styles.dbTagIcon}>📖</Text>
                    <Text style={styles.dbTagText}>菜谱库</Text>
                  </View>
                )}
              </View>
            ) : null}
            <View style={styles.metaChipRow}>
              <View style={[styles.metaChip, styles.metaDifficultyBg]}>
                <Text style={[styles.metaChipText, styles.metaDifficultyText]}>🍃 {mapDifficulty(item.difficulty)}</Text>
              </View>
              <View style={[styles.metaChip, styles.metaTimeBg]}>
                <Text style={[styles.metaChipText, styles.metaTimeText]}>🕒 {item.cookTimeMinutes}分钟</Text>
              </View>
              {!!item.videos.length && (
                <Pressable
                  style={[styles.metaChip, styles.metaVideoBg]}
                  onPress={() => track("recommend_video_clicked", { dishId: item.dishId, url: item.videos[0].url })}
                >
                  <Text style={[styles.metaChipText, styles.metaVideoText]}>▷ 有视频</Text>
                </Pressable>
              )}
            </View>
            {!!item.missingIngredients.length && (
              <View style={styles.missingCard}>
                <Text style={styles.missingLabel}>还需准备</Text>
                <View style={styles.missingByRoleBlock}>
                  {missingMainNames.length > 0 ? (
                    <View style={styles.missingRoleRow}>
                      <Text style={styles.missingRoleTag}>主料</Text>
                      <Text style={styles.missingValue}>{missingMainNames.join("、")}</Text>
                    </View>
                  ) : null}
                  {missingSecondaryNames.length > 0 ? (
                    <View style={styles.missingRoleRow}>
                      <Text style={styles.missingRoleTag}>辅料</Text>
                      <Text style={styles.missingValue}>{missingSecondaryNames.join("、")}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            )}
            <Pressable
              style={styles.openButton}
              onPress={() =>
                onOpenDish({
                  dishId: item.dishId,
                  dishName: item.dishName,
                  cookTimeMinutes: item.cookTimeMinutes,
                  difficulty: item.difficulty,
                  videos: item.videos,
                })
              }
            >
              <Text style={styles.openButtonText}>查看做法</Text>
            </Pressable>
          </View>
          );
        })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  heroCard: {
    backgroundColor: "#ff6b35",
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 6,
  },
  heroSmallTitle: { color: "rgba(255,255,255,0.9)", fontSize: 15 },
  heroTitle: { color: "#fff", fontSize: 36 / 1.5, fontWeight: "700" },
  heroSubtitle: { color: "rgba(255,255,255,0.8)", fontSize: 14 },
  inputCard: { gap: 12 },
  ingredientInputBox: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    backgroundColor: "#fff",
    borderRadius: 16,
    minHeight: 56,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: "center",
  },
  selectedRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  selectedChip: {
    borderRadius: 12,
    backgroundColor: "rgba(255,107,53,0.1)",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  selectedChipText: { color: "#ff6b35", fontSize: 14 },
  selectedChipRemove: { color: "#ff6b35", fontSize: 16, marginTop: -1 },
  textInput: {
    flex: 1,
    minWidth: 120,
    fontSize: 16,
    color: "#1a1a1a",
    paddingVertical: 6,
  },
  quickLabel: { fontSize: 12, color: "#757575", paddingHorizontal: 4 },
  quickWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quickChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#4ecdc4",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  quickChipActive: {
    backgroundColor: "#ff6b35",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  quickPlus: { color: "#fff", fontSize: 14, lineHeight: 16 },
  quickChipText: { color: "#fff", fontSize: 14, fontWeight: "500" },
  primaryButton: {
    backgroundColor: "#ff6b35",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  primaryButtonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
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
  tipCard: {
    backgroundColor: "#fff3e0",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 4,
  },
  tipTitle: { color: "#ff6b35", fontSize: 14, fontWeight: "500" },
  tipDesc: { color: "#ff6b35", fontSize: 14, lineHeight: 22, opacity: 0.85 },
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
  resultSection: { gap: 10 },
  resultHeadRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  resultCount: { color: "#757575", fontSize: 13, flex: 1, paddingRight: 8 },
  subTabRow: {
    flexDirection: "row",
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.06)",
    padding: 4,
    gap: 4,
  },
  subTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  subTabActive: { backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  subTabText: { fontSize: 14, color: "#757575", fontWeight: "500" },
  subTabTextActive: { color: "#8200db" },
  aiBoostButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f3e8ff",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  aiBoostDoneBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f3e8ff",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  aiBoostIcon: { color: "#8200db", fontSize: 13 },
  aiBoostText: { color: "#8200db", fontSize: 14, fontWeight: "500" },
  aiBoostDoneText: { color: "#8200db", fontSize: 14, fontWeight: "500" },
  sortRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  sortButton: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#f5f5f5",
  },
  sortButtonActive: { backgroundColor: "#ff6b35" },
  sortButtonText: { fontSize: 14, color: "#1a1a1a", fontWeight: "500" },
  sortButtonTextActive: { color: "#fff" },
  resultCard: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    borderRadius: 16,
    padding: 16,
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  resultHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  resultTitle: { fontSize: 28 / 1.5, fontWeight: "600", color: "#1a1a1a", flex: 1 },
  favoriteButton: { paddingHorizontal: 8, paddingVertical: 2 },
  favoriteText: { color: "#757575", fontSize: 22 },
  favoriteTextActive: { color: "#ff6b35" },
  matchText: { color: "#ff6b35", fontSize: 14 },
  aiTagRow: { flexDirection: "row", gap: 6, marginTop: -2 },
  aiTag: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e9d4ff",
    backgroundColor: "#f3e8ff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  aiTagIcon: { color: "#8200db", fontSize: 11 },
  aiTagText: { color: "#8200db", fontSize: 12 },
  dbTag: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(78,205,196,0.5)",
    backgroundColor: "rgba(78,205,196,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dbTagIcon: { fontSize: 11 },
  dbTagText: { color: "#2a9d8f", fontSize: 12, fontWeight: "500" },
  aiVerifiedTag: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#b9f8cf",
    backgroundColor: "#dcfce7",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  aiVerifiedTagText: { color: "#008236", fontSize: 12 },
  metaChipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metaChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  metaDifficultyBg: { backgroundColor: "rgba(107,207,127,0.1)" },
  metaDifficultyText: { color: "#6bcf7f" },
  metaTimeBg: { backgroundColor: "rgba(78,205,196,0.1)" },
  metaTimeText: { color: "#4ecdc4" },
  metaVideoBg: { backgroundColor: "#fff3e0" },
  metaVideoText: { color: "#ff6b35" },
  metaChipText: { fontSize: 12 },
  missingCard: {
    backgroundColor: "rgba(255,184,77,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,184,77,0.2)",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  missingLabel: { color: "#ffb84d", fontSize: 12 },
  missingByRoleBlock: { gap: 6, marginTop: 2 },
  missingRoleRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "flex-start", gap: 6 },
  missingRoleTag: {
    color: "#c2410c",
    fontSize: 12,
    fontWeight: "700",
    paddingTop: 1,
  },
  missingValue: { color: "#1a1a1a", fontSize: 14, flex: 1, flexShrink: 1 },
  openButton: {
    borderRadius: 10,
    backgroundColor: "#fff3e0",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  openButtonText: { color: "#ff6b35", fontWeight: "600", fontSize: 13 },
  aiLoadingCard: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "transparent",
    paddingVertical: 40,
  },
  aiLoadingText: { color: "#757575", fontSize: 14 },
});

