import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { track } from "../analytics/tracker";
import { fetchDishByName } from "../features/dish/api/dishApi";
import {
  createCommunityPost,
  mediaUploadInit,
  mediaUploadBlob,
  mediaUploadComplete,
} from "../features/community/api/communityApi";

const TAG_PRESETS = ["家常菜", "快手菜", "新手友好", "下饭菜"];
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

type CreatePostPageProps = {
  onBack: () => void;
  onPublished?: () => void;
};

type UploadPhase = "idle" | "uploading" | "processing" | "done" | "error";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function CreatePostPage({ onBack, onPublished }: CreatePostPageProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [dishQuery, setDishQuery] = useState("");
  const [linkedDish, setLinkedDish] = useState<{ dishId: string; dishName: string } | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [videoAsset, setVideoAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [dishSearchBusy, setDishSearchBusy] = useState(false);

  const [uploadPhase, setUploadPhase] = useState<UploadPhase>("idle");
  const [uploadProgress, setUploadProgress] = useState("");

  const canPublish = title.trim().length > 0 && videoAsset != null && uploadPhase === "idle";

  function toggleTag(tag: string) {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  async function pickVideo() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("需要相册权限", "请在系统设置中允许访问相册以选择视频。");
      return;
    }
    track("create_post_pick_video", {});
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      videoMaxDuration: 120,
      quality: 1,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    if (asset.fileSize != null && asset.fileSize > MAX_VIDEO_BYTES) {
      Alert.alert("文件过大", "请选择 200MB 以内的视频。");
      return;
    }
    setVideoAsset(asset);
  }

  async function searchDish() {
    const q = dishQuery.trim();
    if (!q) {
      Alert.alert("提示", "请输入要搜索的菜谱名称。");
      return;
    }
    setDishSearchBusy(true);
    try {
      const dish = await fetchDishByName(q);
      setLinkedDish({ dishId: dish.dishId, dishName: dish.dishName });
      track("create_post_dish_linked", { dishId: dish.dishId });
    } catch {
      Alert.alert("未找到", "请尝试更具体的菜名。");
      setLinkedDish(null);
    } finally {
      setDishSearchBusy(false);
    }
  }

  function clearLinkedDish() {
    setLinkedDish(null);
  }

  async function onSubmit() {
    if (!canPublish || !videoAsset) return;
    track("create_post_submit", {
      hasVideo: true,
      titleLen: title.trim().length,
      bodyLen: body.trim().length,
      tagCount: selectedTags.length,
      hasLinkedDish: !!linkedDish,
    });

    try {
      // Step 1: upload init
      setUploadPhase("uploading");
      setUploadProgress("正在初始化上传...");
      const mimeType = videoAsset.mimeType ?? "video/mp4";
      const fileName = videoAsset.fileName ?? `video_${Date.now()}.mp4`;
      const initResult = await mediaUploadInit({ fileName, mimeType });

      // Step 2: upload blob
      setUploadProgress("正在上传视频...");
      const fileUri = videoAsset.uri;
      await mediaUploadBlob(initResult.assetId, fileUri, fileName, mimeType);

      // Step 3: upload complete (triggers transcode)
      setUploadProgress("上传完成，正在处理视频...");
      setUploadPhase("processing");
      await mediaUploadComplete(initResult.assetId);

      // Step 4: create post
      setUploadProgress("正在发布...");
      await createCommunityPost({
        title: title.trim(),
        content: body.trim() || undefined,
        dishId: linkedDish?.dishId,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        assetId: initResult.assetId,
        status: "published",
      });

      setUploadPhase("done");
      setUploadProgress("发布成功！");
      track("create_post_success", { assetId: initResult.assetId });
      Alert.alert("发布成功", "视频正在后台处理，预计1-3分钟后可在社区看到。", [
        { text: "好的", onPress: () => onPublished?.() ?? onBack() },
      ]);
    } catch (e) {
      setUploadPhase("error");
      setUploadProgress("");
      const msg = (e as Error).message || "发布失败";
      track("create_post_failed", { message: msg });
      Alert.alert("发布失败", msg, [
        { text: "重试", onPress: () => { setUploadPhase("idle"); onSubmit(); } },
        { text: "取消", style: "cancel", onPress: () => setUploadPhase("idle") },
      ]);
    }
  }

  function removeVideo() {
    setVideoAsset(null);
    setUploadPhase("idle");
    setUploadProgress("");
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <Pressable style={styles.headerIconBtn} onPress={onBack} hitSlop={8}>
            <Text style={styles.headerIcon}>←</Text>
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>
            发布作品
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.fieldBlock}>
            <Text style={styles.label}>视频</Text>
            {videoAsset ? (
              <View style={styles.videoPreviewCard}>
                <View style={styles.videoThumb}>
                  <Text style={styles.videoThumbIcon}>🎬</Text>
                </View>
                <View style={styles.videoInfo}>
                  <Text style={styles.videoFileName} numberOfLines={1}>
                    {videoAsset.fileName ?? "已选视频"}
                  </Text>
                  <View style={styles.videoMetaRow}>
                    {videoAsset.fileSize != null && (
                      <Text style={styles.videoMetaText}>{formatFileSize(videoAsset.fileSize)}</Text>
                    )}
                    {videoAsset.duration != null && (
                      <Text style={styles.videoMetaText}>{formatDuration(videoAsset.duration / 1000)}</Text>
                    )}
                  </View>
                  <Text style={styles.videoReadyLabel}>已就绪</Text>
                </View>
                <Pressable style={styles.videoRemoveBtn} onPress={removeVideo} hitSlop={8}>
                  <Text style={styles.videoRemoveIcon}>✕</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable style={styles.videoDrop} onPress={pickVideo}>
                <Text style={styles.videoIcon}>🎬</Text>
                <Text style={styles.videoPrimary}>从相册选择视频</Text>
                <Text style={styles.videoHint}>支持120s内，200MB以下</Text>
              </Pressable>
            )}
            {videoAsset && (
              <Pressable style={styles.repickBtn} onPress={pickVideo}>
                <Text style={styles.repickText}>重新选择</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.label}>标题</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="给视频起个标题"
              placeholderTextColor="rgba(26,26,26,0.5)"
            />
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.label}>正文（选填）</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={body}
              onChangeText={setBody}
              placeholder="分享你的做菜心得..."
              placeholderTextColor="rgba(26,26,26,0.5)"
              multiline
              textAlignVertical="top"
            />
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.label}>关联菜谱（选填）</Text>
            <View style={styles.dishRow}>
              <TextInput
                style={[styles.input, styles.dishInput]}
                value={dishQuery}
                onChangeText={setDishQuery}
                placeholder="搜索菜谱名称"
                placeholderTextColor="rgba(26,26,26,0.5)"
                onSubmitEditing={searchDish}
                returnKeyType="search"
              />
              <Pressable
                style={[styles.searchBtn, dishSearchBusy && styles.searchBtnDisabled]}
                onPress={searchDish}
                disabled={dishSearchBusy}
              >
                <Text style={styles.searchIcon}>🔍</Text>
              </Pressable>
            </View>
            {linkedDish ? (
              <Pressable style={styles.linkedDish} onPress={clearLinkedDish}>
                <Text style={styles.linkedDishText}>已关联：{linkedDish.dishName}</Text>
                <Text style={styles.linkedDishClear}>✕ 清除</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.label}>标签</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagRow}>
              {TAG_PRESETS.map((tag) => {
                const on = selectedTags.includes(tag);
                return (
                  <Pressable
                    key={tag}
                    style={[styles.tagChip, on && styles.tagChipOn]}
                    onPress={() => toggleTag(tag)}
                  >
                    <Text style={[styles.tagText, on && styles.tagTextOn]}>#{tag}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {uploadPhase !== "idle" && (
            <View style={styles.uploadStatusCard}>
              {uploadPhase === "error" ? (
                <Text style={styles.uploadErrorText}>上传失败，请重试</Text>
              ) : (
                <View style={styles.uploadingRow}>
                  <ActivityIndicator size="small" color="#ff6b35" />
                  <Text style={styles.uploadingText}>{uploadProgress}</Text>
                </View>
              )}
            </View>
          )}

          <Pressable
            style={[styles.publishBtn, !canPublish && styles.publishBtnDisabled]}
            onPress={onSubmit}
            disabled={!canPublish}
          >
            {uploadPhase === "idle" ? (
              <>
                <Text style={styles.publishPlane}>✈</Text>
                <Text style={styles.publishLabel}>发布</Text>
              </>
            ) : (
              <Text style={styles.publishLabel}>{uploadProgress || "处理中..."}</Text>
            )}
          </Pressable>

          <View style={styles.notice}>
            <Text style={styles.noticeText}>💡 视频上传后需要处理，预计1-3分钟后可见</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fafafa" },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.08)",
    backgroundColor: "rgba(250,250,250,0.95)",
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerIcon: { fontSize: 22, color: "#1a1a1a" },
  headerTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: "600",
    color: "#1a1a1a",
    textAlign: "center",
  },
  headerSpacer: { width: 40 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 40,
    gap: 24,
  },
  fieldBlock: { gap: 8 },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#757575",
    paddingLeft: 4,
  },
  videoDrop: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(0,0,0,0.08)",
    borderRadius: 16,
    backgroundColor: "#fafafa",
    minHeight: 200,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 16,
    gap: 8,
  },
  videoIcon: { fontSize: 32, opacity: 0.85 },
  videoPrimary: { fontSize: 14, fontWeight: "600", color: "#757575", textAlign: "center" },
  videoHint: { fontSize: 12, color: "#757575", textAlign: "center" },
  videoPreviewCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    borderRadius: 16,
    padding: 12,
    gap: 12,
  },
  videoThumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  videoThumbIcon: { fontSize: 24 },
  videoInfo: { flex: 1, gap: 2 },
  videoFileName: { fontSize: 14, fontWeight: "600", color: "#1a1a1a" },
  videoMetaRow: { flexDirection: "row", gap: 12 },
  videoMetaText: { fontSize: 12, color: "#757575" },
  videoReadyLabel: { fontSize: 12, color: "#16a34a", fontWeight: "500" },
  videoRemoveBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  videoRemoveIcon: { fontSize: 14, color: "#757575" },
  repickBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  repickText: { fontSize: 13, color: "#ff6b35", fontWeight: "500" },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1a1a1a",
  },
  textArea: { minHeight: 122 },
  dishRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dishInput: { flex: 1 },
  searchBtn: {
    width: 54,
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  searchBtnDisabled: { opacity: 0.6 },
  searchIcon: { fontSize: 20 },
  linkedDish: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  linkedDishText: { fontSize: 13, color: "#1a1a1a", flex: 1 },
  linkedDishClear: { fontSize: 13, color: "#ff6b35" },
  tagRow: { flexDirection: "row", gap: 8, paddingVertical: 2 },
  tagChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
  },
  tagChipOn: {
    backgroundColor: "rgba(255,107,53,0.15)",
  },
  tagText: { fontSize: 14, fontWeight: "600", color: "#757575" },
  tagTextOn: { color: "#ff6b35" },
  uploadStatusCard: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  uploadingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  uploadingText: { fontSize: 14, color: "#757575" },
  uploadErrorText: { fontSize: 14, color: "#dc2626", textAlign: "center" },
  publishBtn: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#ff6b35",
    borderRadius: 16,
    paddingVertical: 16,
    shadowColor: "#ff6b35",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  publishBtnDisabled: { opacity: 0.5 },
  publishPlane: { color: "#fff", fontSize: 18, marginTop: -2 },
  publishLabel: { color: "#fff", fontSize: 16, fontWeight: "600" },
  notice: {
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  noticeText: {
    fontSize: 12,
    color: "#1447e6",
    textAlign: "center",
    lineHeight: 16,
  },
});
