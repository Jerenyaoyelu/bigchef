import { Ionicons } from "@expo/vector-icons";
import { useCallback, useState } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { track } from "../analytics/tracker";
import { joinFamily, getFamily } from "../features/family/api/familyApi";

function normalizeInviteCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

type JoinFamilyPageProps = {
  onBack: () => void;
  onJoined: (familyId: string) => void;
};

export function JoinFamilyPage({ onBack, onJoined }: JoinFamilyPageProps) {
  const [code, setCode] = useState("");

  const canVerify = code.length === 6;

  const onChangeCode = useCallback((t: string) => {
    setCode(normalizeInviteCode(t));
  }, []);

  async function verify() {
    if (!canVerify) return;
    track("family_join_verify", { codeLen: code.length });
    try {
      const result = await joinFamily(code);
      onJoined(result.familyId);
    } catch {
      // 加入失败，可以本地降级
      onJoined("");
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable style={styles.headerIconBtn} onPress={onBack} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color="#1a1a1a" />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          加入家庭
        </Text>
        <View style={styles.headerIconBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroIconWrap}>
          <Ionicons name="person-outline" size={40} color="#ff6b35" />
        </View>

        <Text style={styles.sectionTitle}>输入邀请码</Text>
        <Text style={styles.sectionDesc}>输入 TA 分享的邀请码，一起开始记录</Text>

        <Text style={styles.fieldLabel}>邀请码</Text>
        <TextInput
          style={styles.input}
          value={code}
          onChangeText={onChangeCode}
          placeholder="请输入6位邀请码"
          placeholderTextColor="rgba(26,26,26,0.5)"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={6}
          keyboardType="default"
          textAlign="center"
        />

        <Pressable
          style={[styles.verifyBtn, !canVerify && styles.verifyBtnDisabled]}
          onPress={verify}
          disabled={!canVerify}
        >
          <Text style={styles.verifyBtnText}>验证邀请码</Text>
        </Pressable>

        <View style={styles.tipBar}>
          <Text style={styles.tipText}>💡 邀请码由创建家庭的成员生成，有效期7天</Text>
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
  headerIconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 24, fontWeight: "600", color: "#1a1a1a", textAlign: "center" },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 40,
    alignItems: "stretch",
  },
  heroIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "rgba(255,107,53,0.1)",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1a1a1a",
    textAlign: "center",
    marginBottom: 8,
  },
  sectionDesc: {
    fontSize: 14,
    color: "#757575",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#757575",
    marginBottom: 8,
    paddingLeft: 4,
    alignSelf: "flex-start",
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.08)",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 18,
    fontSize: 24,
    letterSpacing: 1.2,
    color: "#1a1a1a",
    minHeight: 66,
  },
  verifyBtn: {
    marginTop: 24,
    backgroundColor: "#ff6b35",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#ff6b35",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  verifyBtnDisabled: { opacity: 0.5 },
  verifyBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  tipBar: {
    marginTop: 40,
    backgroundColor: "#fff3e0",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  tipText: {
    fontSize: 12,
    color: "#757575",
    textAlign: "center",
    lineHeight: 16,
  },
});
