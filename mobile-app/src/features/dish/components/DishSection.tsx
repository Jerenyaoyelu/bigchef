import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { track } from "../../../analytics/tracker";
import { SectionCard } from "../../../components/common/SectionCard";
import { DishResponse } from "../../../types/api";
import { fetchDishByName } from "../api/dishApi";

type DishSectionProps = {
  onError: (message: string) => void;
  favoriteDishIds: string[];
  onToggleFavorite: (dish: { dishId: string; dishName: string }) => void;
  onOpenDish: (dish: { dishId: string; dishName: string }) => void;
};

export function DishSection({ onError, favoriteDishIds, onToggleFavorite, onOpenDish }: DishSectionProps) {
  const [dishName, setDishName] = useState("可乐鸡翅");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DishResponse | null>(null);
  const [stepMode, setStepMode] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  async function onSubmit() {
    setLoading(true);
    onError("");
    try {
      track("dish_search_submitted", { dishName });
      const data = await fetchDishByName(dishName);
      setResult(data);
      setCurrentStepIndex(0);
      setStepMode(false);
      onOpenDish({ dishId: data.dishId, dishName: data.dishName });
      track("dish_result_loaded", { dishId: data.dishId, hasVideos: data.videos.length > 0 });
    } catch (error) {
      onError(`菜谱查询失败: ${(error as Error).message}`);
      track("dish_search_failed", { message: (error as Error).message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <SectionCard title="按菜名查做法" subtitle="查主辅料、步骤摘要和参考视频，减少搜索跳转">
      <TextInput
        value={dishName}
        onChangeText={setDishName}
        style={styles.input}
        placeholder="例如：可乐鸡翅"
        placeholderTextColor="#8ea0b5"
      />
      <Pressable style={[styles.primaryButton, loading && styles.buttonDisabled]} onPress={onSubmit} disabled={loading}>
        <Text style={styles.primaryButtonText}>{loading ? "查询中..." : "查询菜谱"}</Text>
      </Pressable>
      {!result && <Text style={styles.placeholder}>输入菜名后点击查询，结果会显示在这里</Text>}
      {result && (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>{result.dishName}</Text>
          <Text style={styles.meta}>主料: {result.ingredients.main.join("、") || "暂无"}</Text>
          <Text style={styles.meta}>辅料: {result.ingredients.secondary.join("、") || "暂无"}</Text>
          <Text style={styles.meta}>调味: {result.ingredients.seasoning.join("、") || "暂无"}</Text>
          <View style={styles.stepHeader}>
            <Text style={styles.metaTitle}>步骤摘要</Text>
            <Pressable style={styles.modeToggleButton} onPress={() => setStepMode((prev) => !prev)}>
              <Text style={styles.modeToggleText}>{stepMode ? "查看全部步骤" : "逐步模式"}</Text>
            </Pressable>
          </View>
          {!stepMode &&
            result.stepsSummary.map((step, idx) => (
              <Text key={`${result.dishId}-${idx}`} style={styles.step}>
                {idx + 1}. {step}
              </Text>
            ))}
          {stepMode && !!result.stepsSummary.length && (
            <View style={styles.stepModeCard}>
              <Text style={styles.stepModeProgress}>
                第 {currentStepIndex + 1} / {result.stepsSummary.length} 步
              </Text>
              <Text style={styles.stepModeText}>{result.stepsSummary[currentStepIndex]}</Text>
              <View style={styles.stepModeActionRow}>
                <Pressable
                  style={[styles.stepModeButton, currentStepIndex === 0 && styles.stepModeButtonDisabled]}
                  onPress={() => setCurrentStepIndex((idx) => Math.max(0, idx - 1))}
                  disabled={currentStepIndex === 0}
                >
                  <Text style={styles.stepModeButtonText}>上一步</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.stepModeButton,
                    currentStepIndex === result.stepsSummary.length - 1 && styles.stepModeButtonDisabled,
                  ]}
                  onPress={() => setCurrentStepIndex((idx) => Math.min(result.stepsSummary.length - 1, idx + 1))}
                  disabled={currentStepIndex === result.stepsSummary.length - 1}
                >
                  <Text style={styles.stepModeButtonText}>下一步</Text>
                </Pressable>
              </View>
            </View>
          )}
          {!!result.videos.length && (
            <Pressable onPress={() => track("dish_video_clicked", { dishId: result.dishId, url: result.videos[0].url })}>
              <Text style={styles.link}>视频: {result.videos[0].title}</Text>
            </Pressable>
          )}
          <View style={styles.actionRow}>
            <Pressable
              style={styles.secondaryButton}
              onPress={() => onToggleFavorite({ dishId: result.dishId, dishName: result.dishName })}
            >
              <Text style={styles.secondaryButtonText}>
                {favoriteDishIds.includes(result.dishId) ? "取消收藏" : "收藏菜谱"}
              </Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={() => onOpenDish({ dishId: result.dishId, dishName: result.dishName })}>
              <Text style={styles.secondaryButtonText}>记录浏览</Text>
            </Pressable>
          </View>
        </View>
      )}
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
  resultCard: {
    backgroundColor: "#f8fbff",
    borderWidth: 1,
    borderColor: "#dde7f3",
    borderRadius: 10,
    padding: 10,
    gap: 5,
    marginTop: 4,
  },
  resultTitle: { fontSize: 15, fontWeight: "700", color: "#13233a", marginBottom: 2 },
  meta: { fontSize: 12, color: "#334155" },
  stepHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4, gap: 8 },
  metaTitle: { fontSize: 12, color: "#0f172a", fontWeight: "700", marginTop: 4 },
  modeToggleButton: {
    borderWidth: 1,
    borderColor: "#cdd9e8",
    backgroundColor: "#edf4ff",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  modeToggleText: { fontSize: 11, color: "#1e4fae", fontWeight: "700" },
  step: { fontSize: 12, color: "#334155", paddingLeft: 8, lineHeight: 18 },
  stepModeCard: {
    borderWidth: 1,
    borderColor: "#d7e4f3",
    borderRadius: 10,
    backgroundColor: "#ffffff",
    padding: 10,
    gap: 8,
  },
  stepModeProgress: { fontSize: 11, color: "#64748b", fontWeight: "700" },
  stepModeText: { fontSize: 13, color: "#1e293b", lineHeight: 20 },
  stepModeActionRow: { flexDirection: "row", gap: 8 },
  stepModeButton: {
    flex: 1,
    backgroundColor: "#1f6feb",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  stepModeButtonDisabled: { opacity: 0.45 },
  stepModeButtonText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  link: { fontSize: 12, color: "#1258c8", marginTop: 4, textDecorationLine: "underline" },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 6 },
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

