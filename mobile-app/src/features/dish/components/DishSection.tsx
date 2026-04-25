import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { track } from "../../../analytics/tracker";
import { DishResponse } from "../../../types/api";
import { fetchDishByName } from "../api/dishApi";

type DishSectionProps = {
  onError: (message: string) => void;
  favoriteDishIds: string[];
  onToggleFavorite: (dish: { dishId: string; dishName: string }) => void;
  onOpenDish: (dish: { dishId: string; dishName: string }) => void;
};

export function DishSection({ onError, favoriteDishIds, onToggleFavorite, onOpenDish }: DishSectionProps) {
  const [dishName, setDishName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DishResponse | null>(null);
  const [stepMode, setStepMode] = useState<"all" | "single">("all");
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const popularDishes = ["可乐鸡翅", "西红柿炒鸡蛋", "宫保鸡丁", "红烧肉"];

  async function onSubmit() {
    if (!dishName.trim()) return;
    setLoading(true);
    onError("");
    try {
      track("dish_search_submitted", { dishName });
      const data = await fetchDishByName(dishName);
      setResult(data);
      setCurrentStepIndex(0);
      setStepMode("all");
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

      {result && (
        <View style={styles.resultWrap}>
          <View style={styles.infoCard}>
            <View style={styles.resultHead}>
              <View>
                <Text style={styles.resultTitle}>{result.dishName}</Text>
                <Text style={styles.resultMeta}>⏱️ 35分钟   👨‍🍳 简单</Text>
              </View>
              <Pressable onPress={() => onToggleFavorite({ dishId: result.dishId, dishName: result.dishName })} hitSlop={6}>
                <Text style={[styles.favoriteText, favoriteDishIds.includes(result.dishId) && styles.favoriteTextActive]}>
                  {favoriteDishIds.includes(result.dishId) ? "♥" : "♡"}
                </Text>
              </Pressable>
            </View>
            {!!result.videos.length && (
              <Pressable style={styles.videoButton} onPress={() => track("dish_video_clicked", { dishId: result.dishId, url: result.videos[0].url })}>
                <Text style={styles.videoButtonText}>▷ 观看视频教程</Text>
              </Pressable>
            )}
          </View>

          <IngredientCard title="所需食材" sections={result.ingredients} />

          <View style={styles.stepCard}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepTitle}>烹饪步骤</Text>
              <Pressable style={styles.modeToggleButton} onPress={() => setStepMode((prev) => (prev === "all" ? "single" : "all"))}>
                <Text style={styles.modeToggleText}>{stepMode === "all" ? "☰ 逐步模式" : "☰ 全部步骤"}</Text>
              </Pressable>
            </View>

            {stepMode === "all" &&
              result.stepsSummary.map((step, idx) => (
                <View key={`${result.dishId}-${idx}`} style={styles.stepItem}>
                  <View style={styles.stepIndex}>
                    <Text style={styles.stepIndexText}>{idx + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}

            {stepMode === "single" && !!result.stepsSummary.length && (
              <View style={styles.singleWrap}>
                <Text style={styles.singleProgress}>第 {currentStepIndex + 1} / {result.stepsSummary.length} 步</Text>
                <View style={styles.singleContent}>
                  <View style={styles.singleIndex}>
                    <Text style={styles.singleIndexText}>{currentStepIndex + 1}</Text>
                  </View>
                  <Text style={styles.singleText}>{result.stepsSummary[currentStepIndex]}</Text>
                </View>
                <View style={styles.singleActionRow}>
                  <Pressable
                    style={[styles.singleButtonPrev, currentStepIndex === 0 && styles.singleDisabled]}
                    onPress={() => setCurrentStepIndex((idx) => Math.max(0, idx - 1))}
                    disabled={currentStepIndex === 0}
                  >
                    <Text style={styles.singleButtonPrevText}>‹ 上一步</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.singleButtonNext, currentStepIndex === result.stepsSummary.length - 1 && styles.singleDisabled]}
                    onPress={() => setCurrentStepIndex((idx) => Math.min(result.stepsSummary.length - 1, idx + 1))}
                    disabled={currentStepIndex === result.stepsSummary.length - 1}
                  >
                    <Text style={styles.singleButtonNextText}>下一步 ›</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>

          <View style={styles.bottomActionRow}>
            <Pressable style={styles.bottomActionButton} onPress={() => onOpenDish({ dishId: result.dishId, dishName: result.dishName })}>
              <Text style={styles.bottomActionText}>记录浏览</Text>
            </Pressable>
          </View>
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
  resultWrap: { gap: 12 },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  resultHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  resultTitle: { fontSize: 20, fontWeight: "600", color: "#1a1a1a" },
  resultMeta: { fontSize: 14, color: "#757575", marginTop: 6 },
  favoriteText: { fontSize: 22, color: "#757575" },
  favoriteTextActive: { color: "#ff6b35" },
  videoButton: {
    backgroundColor: "#ff6b35",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  videoButtonText: { color: "#fff", fontSize: 16, fontWeight: "500" },
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
  stepCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 12,
  },
  stepHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  stepTitle: { fontSize: 18, color: "#1a1a1a", fontWeight: "600" },
  modeToggleButton: {
    borderRadius: 999,
    backgroundColor: "rgba(255,107,53,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  modeToggleText: { color: "#ff6b35", fontSize: 14, fontWeight: "500" },
  stepItem: {
    backgroundColor: "rgba(245,245,245,0.5)",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  stepIndex: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: "#ff6b35",
    alignItems: "center",
    justifyContent: "center",
  },
  stepIndexText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  stepText: { flex: 1, color: "#1a1a1a", fontSize: 16, lineHeight: 24 },
  singleWrap: { gap: 12 },
  singleProgress: { textAlign: "center", color: "#757575", fontSize: 14 },
  singleContent: {
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255,107,53,0.05)",
  },
  singleIndex: {
    width: 48,
    height: 48,
    borderRadius: 999,
    backgroundColor: "#ff6b35",
    alignItems: "center",
    justifyContent: "center",
  },
  singleIndexText: { color: "#fff", fontSize: 24, fontWeight: "500" },
  singleText: { color: "#1a1a1a", fontSize: 18, textAlign: "center", lineHeight: 30 },
  singleActionRow: { flexDirection: "row", gap: 8 },
  singleButtonPrev: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
  },
  singleButtonPrevText: { color: "#1a1a1a", fontSize: 16, fontWeight: "500" },
  singleButtonNext: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#ff6b35",
    alignItems: "center",
    justifyContent: "center",
  },
  singleButtonNextText: { color: "#fff", fontSize: 16, fontWeight: "500" },
  singleDisabled: { opacity: 0.45 },
  bottomActionRow: { flexDirection: "row", justifyContent: "flex-end" },
  bottomActionButton: {
    borderRadius: 10,
    backgroundColor: "#fff3e0",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bottomActionText: { color: "#ff6b35", fontSize: 13, fontWeight: "500" },
});

