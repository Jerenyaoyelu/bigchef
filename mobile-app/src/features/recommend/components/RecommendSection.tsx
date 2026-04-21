import { useState } from "react";
import { Button, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { track } from "../../../analytics/tracker";
import { SectionCard } from "../../../components/common/SectionCard";
import { RecommendResponse } from "../../../types/api";
import { fetchRecommendByIngredients } from "../api/recommendApi";

type RecommendSectionProps = {
  onError: (message: string) => void;
};

export function RecommendSection({ onError }: RecommendSectionProps) {
  const [ingredients, setIngredients] = useState("鸡蛋, 西红柿, 葱");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RecommendResponse | null>(null);

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
    <SectionCard title="场景 A：输入食材推荐菜品">
      <TextInput value={ingredients} onChangeText={setIngredients} style={styles.input} />
      <Button title="查询推荐" onPress={onSubmit} disabled={loading} />
      {!result?.list?.length && <Text style={styles.placeholder}>暂无结果</Text>}
      {result?.list?.map((item) => (
        <View key={item.dishId} style={styles.resultCard}>
          <Text style={styles.resultTitle}>{item.dishName}</Text>
          <Text style={styles.meta}>匹配度: {(item.matchScore * 100).toFixed(0)}%</Text>
          <Text style={styles.meta}>耗时: {item.cookTimeMinutes} 分钟 | 难度: {item.difficulty}</Text>
          {!!item.missingIngredients.length && <Text style={styles.meta}>缺少食材: {item.missingIngredients.join("、")}</Text>}
          {!!item.videos.length && (
            <Pressable onPress={() => track("recommend_video_clicked", { dishId: item.dishId, url: item.videos[0].url })}>
              <Text style={styles.link}>视频: {item.videos[0].title}</Text>
            </Pressable>
          )}
        </View>
      ))}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  placeholder: { fontSize: 12, color: "#777", marginTop: 8 },
  resultCard: { backgroundColor: "#fafafa", borderWidth: 1, borderColor: "#eee", borderRadius: 8, padding: 10, gap: 4, marginTop: 8 },
  resultTitle: { fontSize: 15, fontWeight: "600" },
  meta: { fontSize: 12, color: "#333" },
  link: { fontSize: 12, color: "#1565c0", marginTop: 2 },
});

