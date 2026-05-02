import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { track } from "../../../analytics/tracker";
import { useAppConfigStore } from "../../../store/appConfigStore";
import type { CommunityFeedTab, CommunityPost } from "../../../types/api";
import { fetchCommunityPosts } from "../api/communityApi";

type CommunitySectionProps = {
  onError: (message: string) => void;
  onComposePress: () => void;
};

function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const base = useAppConfigStore.getState().apiBaseUrl.replace(/\/$/, "");
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${base}${path}`;
}

function formatDuration(sec: number | null): string {
  if (sec == null || sec <= 0 || !Number.isFinite(sec)) return "00:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function authorLabel(authorId: string) {
  const tail = authorId.slice(-4);
  return tail.length ? `厨友${tail}` : "厨友";
}

export function CommunitySection({ onError, onComposePress }: CommunitySectionProps) {
  const [feedTab, setFeedTab] = useState<CommunityFeedTab>("latest");
  const [items, setItems] = useState<CommunityPost[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadInitial = useCallback(async () => {
    onError("");
    setLoading(true);
    try {
      const res = await fetchCommunityPosts(feedTab);
      setItems(res.items);
      setNextCursor(res.nextCursor);
    } catch (e) {
      onError(`社区加载失败: ${(e as Error).message}`);
      setItems([]);
      setNextCursor(null);
    } finally {
      setLoading(false);
    }
  }, [feedTab, onError]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  async function onRefresh() {
    setRefreshing(true);
    onError("");
    try {
      const res = await fetchCommunityPosts(feedTab);
      setItems(res.items);
      setNextCursor(res.nextCursor);
    } catch (e) {
      onError(`刷新失败: ${(e as Error).message}`);
    } finally {
      setRefreshing(false);
    }
  }

  async function onLoadMore() {
    if (!nextCursor || loadingMore || loading) return;
    setLoadingMore(true);
    onError("");
    try {
      const res = await fetchCommunityPosts(feedTab, { cursor: nextCursor });
      setItems((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        const merged = [...prev];
        for (const p of res.items) {
          if (!seen.has(p.id)) {
            seen.add(p.id);
            merged.push(p);
          }
        }
        return merged;
      });
      setNextCursor(res.nextCursor);
    } catch (e) {
      onError(`加载更多失败: ${(e as Error).message}`);
    } finally {
      setLoadingMore(false);
    }
  }

  function onFabPress() {
    track("community_compose_tap", {});
    onComposePress();
  }

  function onCardPress(post: CommunityPost) {
    track("community_post_card_tap", { postId: post.id });
    Alert.alert("帖子", "详情页即将上线。");
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>社区</Text>
        <View style={styles.segmentRow}>
          <Pressable
            style={[styles.segmentBtn, feedTab === "latest" && styles.segmentBtnActive]}
            onPress={() => setFeedTab("latest")}
          >
            <Text style={[styles.segmentText, feedTab === "latest" && styles.segmentTextActive]}>最新</Text>
          </Pressable>
          <Pressable
            style={[styles.segmentBtn, feedTab === "hot" && styles.segmentBtnActive]}
            onPress={() => setFeedTab("hot")}
          >
            <Text style={[styles.segmentText, feedTab === "hot" && styles.segmentTextActive]}>热门</Text>
          </Pressable>
        </View>
      </View>

      {loading && !items.length ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#ff6b35" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          renderItem={({ item }) => <CommunityPostCard post={item} onPress={() => onCardPress(item)} />}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ff6b35" />}
          onEndReached={() => void onLoadMore()}
          onEndReachedThreshold={0.35}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>暂无动态</Text>
              <Text style={styles.emptyDesc}>快来发布第一条烹饪视频吧</Text>
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoading}>
                <ActivityIndicator color="#ff6b35" />
              </View>
            ) : null
          }
        />
      )}

      <Pressable style={styles.fab} onPress={onFabPress} accessibilityRole="button" accessibilityLabel="发布动态">
        <Text style={styles.fabPlus}>＋</Text>
      </Pressable>
    </View>
  );
}

function CommunityPostCard({ post, onPress }: { post: CommunityPost; onPress: () => void }) {
  const coverUri = resolveMediaUrl(post.coverUrl);
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.mediaWrap}>
        {coverUri ? (
          <Image source={{ uri: coverUri }} style={styles.mediaImage} resizeMode="cover" />
        ) : (
          <LinearGradient colors={["#ffedd4", "#ffe2e2"]} start={{ x: 0.2, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.mediaGradient} />
        )}
        <View style={styles.mediaDim} pointerEvents="none">
          <View style={styles.playCircle}>
            <Text style={styles.playIcon}>▶</Text>
          </View>
        </View>
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{formatDuration(post.durationSec)}</Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {post.title?.trim() || "未命名动态"}
        </Text>
        <View style={styles.cardMeta}>
          <View style={styles.authorRow}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarIcon}>👤</Text>
            </View>
            <Text style={styles.authorName}>{authorLabel(post.authorId)}</Text>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statIcon}>👍</Text>
              <Text style={styles.statNum}>{post.likeCount}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statIcon}>💬</Text>
              <Text style={styles.statNum}>{post.commentCount}</Text>
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const MEDIA_ASPECT = 16 / 9;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fafafa" },
  header: {
    backgroundColor: "rgba(250,250,250,0.95)",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.08)",
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: "#1a1a1a",
    textAlign: "center",
    lineHeight: 32,
  },
  segmentRow: { flexDirection: "row", gap: 8 },
  segmentBtn: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentBtnActive: { backgroundColor: "#ff6b35" },
  segmentText: { fontSize: 14, fontWeight: "600", color: "#757575" },
  segmentTextActive: { color: "#fff" },
  loadingBox: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100, gap: 16 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    overflow: "hidden",
  },
  mediaWrap: {
    width: "100%",
    aspectRatio: MEDIA_ASPECT,
    position: "relative",
    backgroundColor: "#f3f4f6",
  },
  mediaImage: { ...StyleSheet.absoluteFillObject },
  mediaGradient: { flex: 1, width: "100%", height: "100%" },
  mediaDim: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  playCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  playIcon: { fontSize: 18, color: "#ff6b35", marginLeft: 3 },
  durationBadge: {
    position: "absolute",
    right: 12,
    bottom: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  durationText: { color: "#fff", fontSize: 12 },
  cardBody: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14, gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: "600", color: "#1a1a1a", lineHeight: 24 },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatarPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarIcon: { fontSize: 12, opacity: 0.7 },
  authorName: { fontSize: 14, color: "#757575" },
  statsRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  stat: { flexDirection: "row", alignItems: "center", gap: 4 },
  statIcon: { fontSize: 14, opacity: 0.85 },
  statNum: { fontSize: 14, color: "#757575" },
  emptyCard: {
    marginTop: 40,
    padding: 24,
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: "#1a1a1a" },
  emptyDesc: { fontSize: 14, color: "#757575", marginTop: 6, textAlign: "center" },
  footerLoading: { paddingVertical: 16 },
  fab: {
    position: "absolute",
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#ff6b35",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  fabPlus: { color: "#fff", fontSize: 28, fontWeight: "300", marginTop: -2 },
});
