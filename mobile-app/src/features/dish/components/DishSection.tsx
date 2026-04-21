import { useState } from "react";
import { Button, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { track } from "../../../analytics/tracker";
import { SectionCard } from "../../../components/common/SectionCard";
import { DishResponse } from "../../../types/api";
import { fetchDishByName } from "../api/dishApi";

type DishSectionProps = {
  onError: (message: string) => void;
};

export function DishSection({ onError }: DishSectionProps) {
  const [dishName, setDishName] = useState("可乐鸡翅");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DishResponse | null>(null);

  async function onSubmit() {
    setLoading(true);
    onError("");
    try {
      track("dish_search_submitted", { dishName });
      const data = await fetchDishByName(dishName);
      setResult(data);
      track("dish_result_loaded", { dishId: data.dishId, hasVideos: data.videos.length > 0 });
    } catch (error) {
      onError(`菜谱查询失败: ${(error as Error).message}`);
      track("dish_search_failed", { message: (error as Error).message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <SectionCard title="场景 B：输入菜名查询详情">
      <TextInput value={dishName} onChangeText={setDishName} style={styles.input} />
      <Button title="查询菜谱" onPress={onSubmit} disabled={loading} />
      {!result && <Text style={styles.placeholder}>暂无结果</Text>}
      {result && (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>{result.dishName}</Text>
          <Text style={styles.meta}>主料: {result.ingredients.main.join("、") || "暂无"}</Text>
          <Text style={styles.meta}>辅料: {result.ingredients.secondary.join("、") || "暂无"}</Text>
          <Text style={styles.meta}>调味: {result.ingredients.seasoning.join("、") || "暂无"}</Text>
          <Text style={styles.meta}>步骤:</Text>
          {result.stepsSummary.map((step, idx) => (
            <Text key={`${result.dishId}-${idx}`} style={styles.step}>
              {idx + 1}. {step}
            </Text>
          ))}
          {!!result.videos.length && (
            <Pressable onPress={() => track("dish_video_clicked", { dishId: result.dishId, url: result.videos[0].url })}>
              <Text style={styles.link}>视频: {result.videos[0].title}</Text>
            </Pressable>
          )}
        </View>
      )}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  placeholder: { fontSize: 12, color: "#777", marginTop: 8 },
  resultCard: { backgroundColor: "#fafafa", borderWidth: 1, borderColor: "#eee", borderRadius: 8, padding: 10, gap: 4, marginTop: 8 },
  resultTitle: { fontSize: 15, fontWeight: "600" },
  meta: { fontSize: 12, color: "#333" },
  step: { fontSize: 12, color: "#333", paddingLeft: 8 },
  link: { fontSize: 12, color: "#1565c0", marginTop: 2 },
});

