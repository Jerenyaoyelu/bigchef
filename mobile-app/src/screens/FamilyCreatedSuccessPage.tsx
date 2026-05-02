import * as Clipboard from "expo-clipboard";
import { Alert, Pressable, SafeAreaView, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { track } from "../analytics/tracker";

type FamilyCreatedSuccessPageProps = {
  inviteCode: string;
  /** 顶部返回：与「稍后分享」一致，回到「我的」 */
  onBack: () => void;
  onLaterShare: () => void;
};

export function FamilyCreatedSuccessPage({ inviteCode, onBack, onLaterShare }: FamilyCreatedSuccessPageProps) {
  async function copyCode() {
    await Clipboard.setStringAsync(inviteCode);
    track("family_invite_copy", { len: inviteCode.length });
    Alert.alert("已复制", "邀请码已复制到剪贴板");
  }

  async function shareInvite() {
    track("family_invite_share_tap", {});
    try {
      await Share.share({
        message: `来加入我的 BigChef 家庭空间吧！邀请码：${inviteCode}（7天内有效）`,
        title: "家庭邀请",
      });
    } catch {
      /* user dismissed */
    }
  }

  function laterShare() {
    track("family_invite_later", {});
    onLaterShare();
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable style={styles.headerBtn} onPress={onBack} hitSlop={8}>
          <Text style={styles.headerBtnText}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          创建家庭
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.successIconWrap}>
          <Text style={styles.successIcon}>👨‍👩‍👧</Text>
        </View>

        <Text style={styles.successTitle}>家庭创建成功</Text>
        <Text style={styles.successSubtitle}>邀请 TA 一起开始记录你们的美食生活</Text>

        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>邀请码</Text>
          <View style={styles.codeRow}>
            <Text style={styles.codeValue}>{inviteCode}</Text>
            <Pressable style={styles.copyBtn} onPress={copyCode} accessibilityLabel="复制邀请码">
              <Text style={styles.copyIcon}>📋</Text>
            </Pressable>
          </View>
          <Text style={styles.codeHint}>邀请码7天内有效</Text>
        </View>

        <Pressable style={styles.sharePrimary} onPress={shareInvite}>
          <Text style={styles.sharePrimaryIcon}>↗</Text>
          <Text style={styles.sharePrimaryText}>分享邀请</Text>
        </Pressable>

        <Pressable style={styles.laterWrap} onPress={laterShare} hitSlop={12}>
          <Text style={styles.laterText}>稍后分享</Text>
        </Pressable>

        <View style={styles.tipBox}>
          <Text style={styles.tipText}>
            💡 TA 输入邀请码后，你们就可以一起规划菜单、共享采购清单啦
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fafafa" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.08)",
    backgroundColor: "rgba(250,250,250,0.95)",
  },
  headerBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  headerBtnText: { fontSize: 22, color: "#1a1a1a" },
  headerTitle: { flex: 1, fontSize: 24, fontWeight: "600", color: "#1a1a1a", textAlign: "center" },
  headerSpacer: { width: 40 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 40,
    alignItems: "center",
  },
  successIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  successIcon: { fontSize: 40 },
  successTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1a1a1a",
    textAlign: "center",
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 14,
    color: "#757575",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  codeCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    paddingHorizontal: 24,
    paddingVertical: 24,
    marginBottom: 28,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  codeLabel: {
    fontSize: 14,
    color: "#757575",
    textAlign: "center",
    marginBottom: 12,
  },
  codeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    marginBottom: 12,
  },
  codeValue: {
    fontSize: 30,
    fontWeight: "700",
    color: "#ff6b35",
    letterSpacing: 1.5,
  },
  copyBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  copyIcon: { fontSize: 18 },
  codeHint: {
    fontSize: 12,
    color: "#757575",
    textAlign: "center",
  },
  sharePrimary: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#ff6b35",
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 12,
    shadowColor: "#ff6b35",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  sharePrimaryIcon: { color: "#fff", fontSize: 18, marginTop: -2 },
  sharePrimaryText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  laterWrap: {
    paddingVertical: 14,
    marginBottom: 24,
  },
  laterText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#757575",
    textAlign: "center",
  },
  tipBox: {
    width: "100%",
    backgroundColor: "#fff3e0",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  tipText: {
    fontSize: 12,
    color: "#757575",
    textAlign: "center",
    lineHeight: 18,
  },
});
