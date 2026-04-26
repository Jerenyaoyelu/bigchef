import { Pressable, StyleSheet, Text, View } from "react-native";

type VideoTutorialCardProps = {
  hasVideo: boolean;
  requestState: "idle" | "requested";
  onWatchVideo?: () => void;
  onViewSteps?: () => void;
  onRequestVideo?: () => void;
};

export function VideoTutorialCard({
  hasVideo,
  requestState,
  onWatchVideo,
  onViewSteps,
  onRequestVideo,
}: VideoTutorialCardProps) {
  if (hasVideo) {
    return (
      <View style={styles.videoSectionCard}>
        <View style={styles.videoPreview}>
          <Text style={styles.videoPlayIcon}>▷</Text>
          <Text style={styles.videoLoadingText}>视频加载中...</Text>
        </View>
        <Pressable style={styles.watchVideoButton} onPress={onWatchVideo}>
          <Text style={styles.watchVideoText}>▷ 观看视频教程</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.videoEmptySectionCard}>
      {requestState === "requested" && (
        <View style={styles.requestSuccessBanner}>
          <Text style={styles.requestSuccessText}>已收录你的需求，我们会优先补充这个菜谱的视频</Text>
        </View>
      )}
      <View style={styles.videoEmptyCenter}>
        <View style={styles.videoEmptyIconWrap}>
          <Text style={styles.videoEmptyIcon}>◌</Text>
        </View>
        <Text style={styles.videoEmptyTitle}>暂无视频教程</Text>
        <Text style={styles.videoEmptyDesc}>可以先查看图文步骤，或者告诉我们你需要视频</Text>
      </View>
      <Pressable style={styles.viewStepsButton} onPress={onViewSteps}>
        <Text style={styles.viewStepsText}>先看图文步骤</Text>
      </Pressable>
      <Pressable
        style={[styles.requestVideoButton, requestState === "requested" && styles.requestVideoButtonDisabled]}
        onPress={onRequestVideo}
        disabled={requestState === "requested"}
      >
        <Text style={styles.requestVideoText}>{requestState === "requested" ? "已提交需求" : "求更新该菜谱视频"}</Text>
      </Pressable>
      {requestState === "requested" && (
        <View style={styles.requestHintBox}>
          <Text style={styles.requestHintText}>✓ 已收录你的需求，我们会优先补充这个菜谱的视频</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  videoSectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    gap: 12,
  },
  videoPreview: {
    height: 200,
    borderRadius: 16,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  videoPlayIcon: { color: "#fff", fontSize: 48, lineHeight: 48 },
  videoLoadingText: { color: "rgba(255,255,255,0.58)", fontSize: 13 },
  watchVideoButton: {
    backgroundColor: "#ff6b35",
    borderRadius: 14,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#ff6b35",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  watchVideoText: { color: "#fff", fontSize: 15, fontWeight: "500" },
  videoEmptySectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    backgroundColor: "#fff3e0",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    gap: 12,
  },
  requestSuccessBanner: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#9edab4",
    backgroundColor: "#ecfdf3",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  requestSuccessText: { color: "#0a7d36", fontSize: 12, textAlign: "center" },
  videoEmptyCenter: { alignItems: "center", gap: 6, paddingTop: 2 },
  videoEmptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 999,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
  },
  videoEmptyIcon: { color: "#8a8a8a", fontSize: 24 },
  videoEmptyTitle: { color: "#1a1a1a", fontSize: 16, fontWeight: "600" },
  videoEmptyDesc: { color: "#757575", fontSize: 12, textAlign: "center", lineHeight: 18 },
  viewStepsButton: {
    backgroundColor: "#ff6b35",
    borderRadius: 14,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#ff6b35",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  viewStepsText: { color: "#fff", fontSize: 15, fontWeight: "500" },
  requestVideoButton: {
    backgroundColor: "#4ecdc4",
    borderRadius: 14,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  requestVideoButtonDisabled: { opacity: 0.5 },
  requestVideoText: { color: "#fff", fontSize: 15, fontWeight: "500" },
  requestHintBox: {
    borderRadius: 12,
    backgroundColor: "#fafafa",
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  requestHintText: { color: "#757575", fontSize: 12, textAlign: "center" },
});

