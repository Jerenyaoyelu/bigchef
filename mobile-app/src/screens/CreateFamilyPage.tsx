import { useState } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { track } from "../analytics/tracker";

export type HouseholdRelationChoice = "couple" | "roommates";

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export type CreateFamilyResult = {
  inviteCode: string;
  familyName: string;
  relation: HouseholdRelationChoice;
};

type CreateFamilyPageProps = {
  onBack: () => void;
  onCreated: (result: CreateFamilyResult) => void;
};

export function CreateFamilyPage({ onBack, onCreated }: CreateFamilyPageProps) {
  const [name, setName] = useState("");
  const [relation, setRelation] = useState<HouseholdRelationChoice>("couple");

  const canSubmit = name.trim().length > 0;

  function submit() {
    if (!canSubmit) return;
    const inviteCode = generateInviteCode();
    const familyName = name.trim();
    track("family_create_submit", { relation, nameLen: familyName.length });
    onCreated({ inviteCode, familyName, relation });
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

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.heroIconWrap}>
          <Text style={styles.heroIcon}>👨‍👩‍👧</Text>
        </View>

        <Text style={styles.fieldLabel}>家庭名称</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="例如：我们的小窝"
          placeholderTextColor="rgba(26,26,26,0.5)"
        />

        <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>关系类型</Text>

        <Pressable
          style={[styles.relationCard, relation === "couple" && styles.relationCardSelected]}
          onPress={() => setRelation("couple")}
        >
          <View style={[styles.relationIcon, styles.relationIconCouple]}>
            <Text style={styles.relationEmoji}>♡</Text>
          </View>
          <View style={styles.relationTextCol}>
            <Text style={styles.relationTitle}>情侣</Text>
            <Text style={styles.relationDesc}>一起规划每周的晚餐，记录你们喜欢的味道</Text>
          </View>
        </Pressable>

        <Pressable
          style={[styles.relationCard, relation === "roommates" && styles.relationCardSelected]}
          onPress={() => setRelation("roommates")}
        >
          <View style={[styles.relationIcon, styles.relationIconRoom]}>
            <Text style={styles.relationEmoji}>🏠</Text>
          </View>
          <View style={styles.relationTextCol}>
            <Text style={styles.relationTitle}>合租同伴</Text>
            <Text style={styles.relationDesc}>分担做饭，共享采购清单，让生活更轻松</Text>
          </View>
        </Pressable>

        <Pressable style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]} onPress={submit} disabled={!canSubmit}>
          <Text style={styles.submitBtnText}>创建家庭</Text>
        </Pressable>
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
  scrollContent: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 40 },
  heroIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "rgba(255,107,53,0.1)",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 24,
  },
  heroIcon: { fontSize: 36 },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#757575",
    marginBottom: 8,
    paddingLeft: 4,
  },
  fieldLabelSpaced: { marginTop: 8 },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#1a1a1a",
    minHeight: 56,
  },
  relationCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 12,
  },
  relationCardSelected: {
    borderWidth: 2,
    borderColor: "#ff6b35",
  },
  relationIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  relationIconCouple: { backgroundColor: "#ffe2e2" },
  relationIconRoom: { backgroundColor: "#dbeafe" },
  relationEmoji: { fontSize: 22 },
  relationTextCol: { flex: 1, gap: 4 },
  relationTitle: { fontSize: 16, fontWeight: "600", color: "#1a1a1a" },
  relationDesc: { fontSize: 14, color: "#757575", lineHeight: 20 },
  submitBtn: {
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
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
