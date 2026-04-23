import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { track } from "../../../analytics/tracker";
import { SectionCard } from "../../../components/common/SectionCard";
import { RecommendResponse } from "../../../types/api";
import { fetchRecommendByIngredients } from "../api/recommendApi";

type RecommendSectionProps = {
  onError: (message: string) => void;
  favoriteDishIds: string[];
  onToggleFavorite: (dish: { dishId: string; dishName: string }) => void;
  onOpenDish: (dish: { dishId: string; dishName: string }) => void;
};

export function RecommendSection({ onError, favoriteDishIds, onToggleFavorite, onOpenDish }: RecommendSectionProps) {
  const [ingredients, setIngredients] = useState("鸡蛋, 西红柿, 葱");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RecommendResponse | null>(null);
  const [sortMode, setSortMode] = useState<"match" | "missing" | "time">("match");

  const sortedList = useMemo(() => {
    const list = result?.list ?? [];
    return [...list].sort((a, b) => {
      if (sortMode === "missing") return a.missingIngredients.length - b.missingIngredients.length;
      if (sortMode === "time") return a.cookTimeMinutes - b.cookTimeMinutes;
      return b.matchScore - a.matchScore;
    });
  }, [result?.list, sortMode]);

  async function onSubmit() {
    setLoading(true);
    onError("");
    try {
      const list = ingredients
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      track("recommend_search_submitted", { ingredients: list });
      const data = await fetchRecommendByIngredients(list);
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
    <SectionCard title="按食材推荐菜品" subtitle="输入食材后，按匹配度返回推荐菜谱">
      <TextInput
        value={ingredients}
        onChangeText={setIngredients}
        style={styles.input}
        placeholder="例如：鸡蛋, 西红柿, 葱"
        placeholderTextColor="#8ea0b5"
      />
      <Pressable style={[styles.primaryButton, loading && styles.buttonDisabled]} onPress={onSubmit} disabled={loading}>
        <Text style={styles.primaryButtonText}>{loading ? "查询中..." : "查询推荐"}</Text>
      </Pressable>
      {!!result?.list?.length && (
        <View style={styles.sortRow}>
          <Text style={styles.sortLabel}>排序</Text>
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
      )}
      {!result?.list?.length && <Text style={styles.placeholder}>输入食材后点击查询，结果会显示在这里</Text>}
      {sortedList.map((item) => (
        <View key={item.dishId} style={styles.resultCard}>
          <View style={styles.resultHead}>
            <Text style={styles.resultTitle}>{item.dishName}</Text>
            <Text style={styles.badge}>匹配 {(item.matchScore * 100).toFixed(0)}%</Text>
          </View>
          <Text style={styles.meta}>预计耗时: {item.cookTimeMinutes} 分钟</Text>
          <Text style={styles.meta}>难度等级: {item.difficulty}</Text>
          {!!item.missingIngredients.length && <Text style={styles.meta}>缺少食材: {item.missingIngredients.join("、")}</Text>}
          {!!item.videos.length && (
            <Pressable onPress={() => track("recommend_video_clicked", { dishId: item.dishId, url: item.videos[0].url })}>
              <Text style={styles.link}>视频: {item.videos[0].title}</Text>
            </Pressable>
          )}
          <View style={styles.actionRow}>
            <Pressable
              style={styles.secondaryButton}
              onPress={() => onToggleFavorite({ dishId: item.dishId, dishName: item.dishName })}
            >
              <Text style={styles.secondaryButtonText}>
                {favoriteDishIds.includes(item.dishId) ? "取消收藏" : "收藏菜谱"}
              </Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={() => onOpenDish({ dishId: item.dishId, dishName: item.dishName })}>
              <Text style={styles.secondaryButtonText}>加入最近浏览</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: "#d4dce6",
    backgroundColor: "#f9fbff",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 13,
  },
  primaryButton: {
    backgroundColor: "#1f6feb",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  primaryButtonText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  buttonDisabled: { opacity: 0.65 },
  placeholder: { fontSize: 12, color: "#738396", marginTop: 2 },
  sortRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
  sortLabel: { fontSize: 12, color: "#475569", marginRight: 2 },
  sortButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#cfd9e6",
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#f4f8fe",
  },
  sortButtonActive: { borderColor: "#1f6feb", backgroundColor: "#e8f0ff" },
  sortButtonText: { fontSize: 11, color: "#4b5f79", fontWeight: "600" },
  sortButtonTextActive: { color: "#1f6feb" },
  resultCard: {
    backgroundColor: "#f8fbff",
    borderWidth: 1,
    borderColor: "#dde7f3",
    borderRadius: 10,
    padding: 10,
    gap: 5,
    marginTop: 4,
  },
  resultHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  resultTitle: { fontSize: 15, fontWeight: "700", color: "#13233a", flex: 1 },
  badge: {
    fontSize: 11,
    color: "#0b5394",
    backgroundColor: "#dceeff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  meta: { fontSize: 12, color: "#334155" },
  link: { fontSize: 12, color: "#1258c8", marginTop: 2, textDecorationLine: "underline" },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#bfd2e8",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: "#eef5ff",
  },
  secondaryButtonText: { fontSize: 12, color: "#174ea6", fontWeight: "600" },
});

