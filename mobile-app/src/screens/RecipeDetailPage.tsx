import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { track } from "../analytics/tracker";
import { CookingStepsCard } from "../features/dish/components/CookingStepsCard";
import { VideoTutorialCard } from "../features/dish/components/VideoTutorialCard";
import { fetchDishById } from "../features/dish/api/dishApi";
import { useUserFoodStore } from "../store/userFoodStore";
import { DishDetailPrefetch, DishResponse } from "../types/api";

type RecipeDetailPageProps = {
  dishId: string;
  /** 从推荐列表进入时携带，用于首屏展示已有字段 */
  listPreview?: DishDetailPrefetch | null;
  favoriteDishIds: string[];
  onToggleFavorite: (dish: { dishId: string; dishName: string }) => void;
  onBack: () => void;
  onOpenDish: (dish: { dishId: string; dishName: string }) => void;
};

export function RecipeDetailPage({
  dishId,
  listPreview,
  favoriteDishIds,
  onToggleFavorite,
  onBack,
  onOpenDish,
}: RecipeDetailPageProps) {
  const likedDishIds = useUserFoodStore((s) => s.likedDishIds);
  const likeCountByDish = useUserFoodStore((s) => s.likeCountByDish);
  const toggleDishLike = useUserFoodStore((s) => s.toggleDishLike);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DishResponse | null>(null);
  const [error, setError] = useState("");
  const [videoRequestState, setVideoRequestState] = useState<"idle" | "requested">("idle");

  const preview = listPreview?.dishId === dishId ? listPreview : null;

  useEffect(() => {
    setVideoRequestState("idle");
  }, [dishId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError("");
      setResult(null);
      try {
        const data = await fetchDishById(dishId);
        if (cancelled) return;
        setResult(data);
        onOpenDish({ dishId: data.dishId, dishName: data.dishName });
      } catch (err) {
        if (!cancelled) setError((err as Error).message || "加载失败");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dishId, onOpenDish]);

  const headerTitle = result?.dishName ?? preview?.dishName ?? "菜谱详情";
  const isFavorite = useMemo(() => favoriteDishIds.includes(dishId), [favoriteDishIds, dishId]);
  const detailLikeCount = likeCountByDish[dishId] ?? result?.likeCount ?? 0;
  const detailLiked = likedDishIds.includes(dishId);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.headerIconButton} onPress={onBack}>
          <Text style={styles.headerIcon}>←</Text>
        </Pressable>
        <Text numberOfLines={1} style={styles.headerTitle}>
          {headerTitle}
        </Text>
        <View style={styles.headerRightActions}>
          <Pressable
            style={styles.headerLikePressable}
            onPress={async () => {
              setError("");
              const res = await toggleDishLike(dishId);
              if (res && result) setResult({ ...result, likeCount: res.likeCount });
              if (!res) setError("点赞失败，请稍后重试");
            }}
          >
            <Text style={[styles.headerLikeText, detailLiked && styles.likeActive]}>👍 {detailLikeCount}</Text>
          </Pressable>
          <Pressable
            style={styles.headerIconButton}
            onPress={() => {
              const name = result?.dishName ?? preview?.dishName;
              if (!name) return;
              onToggleFavorite({ dishId, dishName: name });
            }}
          >
            <Text style={[styles.headerIcon, isFavorite && styles.favoriteActive]}>{isFavorite ? "♥" : "♡"}</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {!!error && <Text style={styles.errorText}>{error}</Text>}
        {loading && preview && (
          <>
            <View style={styles.baseCard}>
              <Text style={styles.baseTitle}>{preview.dishName}</Text>
              <View style={styles.baseMeta}>
                <Text style={styles.baseMetaText}>◷ {preview.cookTimeMinutes ?? 20}分钟</Text>
                <Text style={styles.baseMetaText}>👨‍🍳 {mapDifficulty(preview.difficulty)}</Text>
              </View>
            </View>
            <VideoTutorialCard
              hasVideo={(preview.videos?.length ?? 0) > 0}
              requestState={videoRequestState}
              onWatchVideo={() => {
                const v = preview.videos?.[0];
                if (!v?.url) return;
                track("dish_video_clicked", { dishId, url: v.url, source: "recipe_detail_page_preview" });
              }}
              onRequestVideo={() => {
                setVideoRequestState("requested");
                track("video_request_update_click", { dishId, source: "recipe_detail_page_preview" });
              }}
            />
            <View style={styles.loadingInline}>
              <ActivityIndicator size="small" color="#ff6b35" />
              <Text style={styles.loadingInlineText}>正在加载配料与步骤…</Text>
            </View>
          </>
        )}
        {loading && !preview && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#ff6b35" />
            <Text style={styles.loadingText}>菜谱详情加载中...</Text>
          </View>
        )}
        {!loading && result && (
          <>
            <View style={styles.baseCard}>
              <Text style={styles.baseTitle}>{result.dishName}</Text>
              <View style={styles.baseMeta}>
                <Text style={styles.baseMetaText}>◷ {result.cookTimeMinutes ?? 20}分钟</Text>
                <Text style={styles.baseMetaText}>👨‍🍳 {mapDifficulty(result.difficulty)}</Text>
                <Pressable
                  onPress={async () => {
                    setError("");
                    const res = await toggleDishLike(dishId);
                    if (res) setResult({ ...result, likeCount: res.likeCount });
                    if (!res) setError("点赞失败，请稍后重试");
                  }}
                >
                  <Text style={[styles.baseMetaText, detailLiked && styles.likeActive]}>👍 {detailLikeCount}</Text>
                </Pressable>
              </View>
            </View>

            <VideoTutorialCard
              hasVideo={result.videos.length > 0}
              requestState={videoRequestState}
              onWatchVideo={() => {
                if (!result.videos.length) return;
                track("dish_video_clicked", { dishId: result.dishId, url: result.videos[0].url, source: "recipe_detail_page" });
              }}
              onRequestVideo={() => {
                setVideoRequestState("requested");
                track("video_request_update_click", { dishId: result.dishId, source: "recipe_detail_page" });
              }}
            />

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>所需食材</Text>
              <IngredientGroup label="主料" color="#ff6b35" items={result.ingredients.main} />
              <IngredientGroup label="辅料" color="#4ecdc4" items={result.ingredients.secondary} />
              <IngredientGroup label="调料" color="#757575" items={result.ingredients.seasoning} />
            </View>

            <CookingStepsCard steps={result.stepsSummary} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

type IngredientGroupProps = {
  label: string;
  color: string;
  items: string[];
};

function IngredientGroup({ label, color, items }: IngredientGroupProps) {
  if (!items.length) return null;
  return (
    <View style={styles.ingredientGroup}>
      <Text style={[styles.ingredientLabel, { color }]}>{label}</Text>
      {items.map((item, idx) => (
        <View key={`${label}-${idx}-${item}`} style={styles.ingredientRow}>
          <View style={[styles.ingredientDot, { backgroundColor: color }]} />
          <Text style={styles.ingredientText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function mapDifficulty(level?: number) {
  if (!level || level <= 1) return "简单";
  if (level <= 3) return "中等";
  return "较难";
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },
  header: {
    height: 64,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.08)",
    backgroundColor: "rgba(250,250,250,0.95)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  headerRightActions: { flexDirection: "row", alignItems: "center", flexShrink: 0, gap: 2 },
  headerLikePressable: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    minHeight: 36,
    justifyContent: "center",
    borderRadius: 18,
  },
  headerLikeText: { fontSize: 15, color: "#1a1a1a", fontWeight: "600" },
  headerIconButton: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 18 },
  headerIcon: { fontSize: 24, color: "#1a1a1a" },
  favoriteActive: { color: "#ff6b35" },
  likeActive: { color: "#ff6b35" },
  headerTitle: { flex: 1, fontSize: 22, color: "#1a1a1a", fontWeight: "600", marginHorizontal: 8, minWidth: 0 },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24, gap: 12 },
  errorText: { color: "#b91c1c", fontSize: 13 },
  loadingWrap: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "transparent",
    paddingVertical: 40,
  },
  loadingText: { color: "#757575", fontSize: 14 },
  loadingInline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 20,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  loadingInlineText: { color: "#757575", fontSize: 14 },
  baseCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 6,
  },
  baseTitle: { color: "#1a1a1a", fontSize: 20, fontWeight: "600" },
  baseMeta: { flexDirection: "row", gap: 16 },
  baseMetaText: { color: "#757575", fontSize: 14 },
  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 10,
  },
  sectionTitle: { color: "#1a1a1a", fontSize: 18, fontWeight: "600" },
  ingredientGroup: { gap: 6 },
  ingredientLabel: { fontSize: 14, fontWeight: "500" },
  ingredientRow: {
    borderRadius: 10,
    backgroundColor: "#fff3e0",
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  ingredientDot: { width: 8, height: 8, borderRadius: 99 },
  ingredientText: { color: "#1a1a1a", fontSize: 14 },
});

