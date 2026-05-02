import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { track } from "../analytics/tracker";

type FamilyHomePageProps = {
  onBack: () => void;
  onCreateFamily: () => void;
  onJoinFamily: () => void;
};

const FEATURES = [
  "一起规划每周菜单，不强制确认",
  "合并食材生成采购清单",
  "查看常做菜统计，快速安排",
  "心愿菜池，记录想吃的菜",
];

export function FamilyHomePage({ onBack, onCreateFamily, onJoinFamily }: FamilyHomePageProps) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable style={styles.headerBtn} onPress={onBack} hitSlop={8}>
          <Text style={styles.headerBtnText}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          家庭空间
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heroIconWrap}>
          <Text style={styles.heroIcon}>♥</Text>
        </View>
        <Text style={styles.heroTitle}>开启你的家庭空间</Text>
        <Text style={styles.heroDesc}>和家人一起规划菜单、共享采购清单，让生活更有序</Text>

        <Pressable
          style={styles.primaryBtn}
          onPress={() => {
            track("family_create_tap", {});
            onCreateFamily();
          }}
        >
          <Text style={styles.primaryBtnText}>创建家庭</Text>
        </Pressable>
        <Pressable
          style={styles.secondaryBtn}
          onPress={() => {
            track("family_join_tap", {});
            onJoinFamily();
          }}
        >
          <Text style={styles.secondaryBtnText}>加入家庭</Text>
        </Pressable>

        <View style={styles.featureCard}>
          <Text style={styles.featureTitle}>家庭空间功能</Text>
          <View style={styles.featureList}>
            {FEATURES.map((line) => (
              <View key={line} style={styles.featureRow}>
                <Text style={styles.featureBullet}>•</Text>
                <Text style={styles.featureText}>{line}</Text>
              </View>
            ))}
          </View>
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
    paddingTop: 48,
    paddingBottom: 40,
    alignItems: "center",
  },
  heroIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: "rgba(255,107,53,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  heroIcon: { fontSize: 48, color: "#ff6b35" },
  heroTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1a1a1a",
    textAlign: "center",
    marginBottom: 8,
  },
  heroDesc: {
    fontSize: 16,
    color: "#757575",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  primaryBtn: {
    width: "100%",
    backgroundColor: "#ff6b35",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#ff6b35",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  secondaryBtn: {
    width: "100%",
    backgroundColor: "#4ecdc4",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 32,
  },
  secondaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  featureCard: {
    width: "100%",
    backgroundColor: "#fff3e0",
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 24,
    gap: 12,
  },
  featureTitle: { fontSize: 18, fontWeight: "600", color: "#1a1a1a" },
  featureList: { gap: 8 },
  featureRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  featureBullet: { color: "#ff6b35", fontSize: 14, lineHeight: 20 },
  featureText: { flex: 1, color: "#757575", fontSize: 14, lineHeight: 20 },
});
