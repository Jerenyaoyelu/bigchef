import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { track } from "../../../analytics/tracker";
import { RecommendResponse } from "../../../types/api";
import { fetchRecommendByIngredients } from "../api/recommendApi";

type RecommendSectionProps = {
  onError: (message: string) => void;
  favoriteDishIds: string[];
  onToggleFavorite: (dish: { dishId: string; dishName: string }) => void;
  onOpenDish: (dish: { dishId: string; dishName: string }) => void;
};

export function RecommendSection({ onError, favoriteDishIds, onToggleFavorite, onOpenDish }: RecommendSectionProps) {
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RecommendResponse | null>(null);
  const [sortMode, setSortMode] = useState<"match" | "missing" | "time">("match");
  const commonIngredients = ["鸡蛋", "西红柿", "土豆", "鸡肉", "猪肉", "牛肉", "白菜", "豆腐", "葱", "姜", "蒜", "青椒"];

  const sortedList = useMemo(() => {
    const list = result?.list ?? [];
    return [...list].sort((a, b) => {
      if (sortMode === "missing") return a.missingIngredients.length - b.missingIngredients.length;
      if (sortMode === "time") return a.cookTimeMinutes - b.cookTimeMinutes;
      return b.matchScore - a.matchScore;
    });
  }, [result?.list, sortMode]);

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
      </View>

      {!result?.list?.length && (
        <View style={styles.tipCard}>
          <Text style={styles.tipTitle}>💡 小提示</Text>
          <Text style={styles.tipDesc}>添加你现有的食材，可以手动输入或点击下方常用食材。我们会为你推荐最匹配的菜谱！</Text>
        </View>
      )}

      {!!result?.list?.length && (
        <View style={styles.resultSection}>
          <Text style={styles.resultCount}>找到 {result.total} 个匹配菜谱</Text>
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

      {sortedList.map((item) => (
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
              <Text style={styles.missingLabel}>还需准备：</Text>
              <Text style={styles.missingValue}>{item.missingIngredients.join("、")}</Text>
            </View>
          )}
          <Pressable style={styles.openButton} onPress={() => onOpenDish({ dishId: item.dishId, dishName: item.dishName })}>
            <Text style={styles.openButtonText}>查看做法</Text>
          </Pressable>
        </View>
      ))}
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
  tipCard: {
    backgroundColor: "#fff3e0",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 4,
  },
  tipTitle: { color: "#ff6b35", fontSize: 14, fontWeight: "500" },
  tipDesc: { color: "#ff6b35", fontSize: 14, lineHeight: 22, opacity: 0.85 },
  resultSection: { gap: 10 },
  resultCount: { color: "#757575", fontSize: 14 },
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
  missingValue: { color: "#1a1a1a", fontSize: 14 },
  openButton: {
    borderRadius: 10,
    backgroundColor: "#fff3e0",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  openButtonText: { color: "#ff6b35", fontWeight: "600", fontSize: 13 },
});

