import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";

import { useFamilySpaceStore } from "../store/familySpaceStore";
import { selectPendingCount, useShoppingListStore } from "../store/shoppingListStore";
import { useWishlistStore, wishlistMenuSubtitle } from "../store/wishlistStore";

type FamilyDetailPageProps = {
  onBack: () => void;
  onOpenWeekMenu: () => void;
  onOpenShoppingList: () => void;
  onOpenFrequentDishes: () => void;
  onOpenWishlist: () => void;
};

function relationLabel(relation: "couple" | "roommates" | null): string {
  if (relation === "roommates") return "合租";
  return "情侣";
}

type MenuRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  iconBoxColor: string;
  title: string;
  subtitle: string;
  onPress: () => void;
};

function MenuRow({ icon, iconBoxColor, title, subtitle, onPress }: MenuRowProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed]}
      onPress={onPress}
    >
      <View style={styles.menuRowLeft}>
        <View style={[styles.menuIconBox, { backgroundColor: iconBoxColor }]}>
          <Ionicons name={icon} size={20} color="#1a1a1a" />
        </View>
        <View style={styles.menuTextCol}>
          <Text style={styles.menuTitle}>{title}</Text>
          <Text style={styles.menuSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9e9e9e" />
    </Pressable>
  );
}

export function FamilyDetailPage({
  onBack,
  onOpenWeekMenu,
  onOpenShoppingList,
  onOpenFrequentDishes,
  onOpenWishlist,
}: FamilyDetailPageProps) {
  const memberCount = useFamilySpaceStore((s) => s.memberCount);
  const weeklyDishCount = useFamilySpaceStore((s) => s.weeklyDishCount);
  const relation = useFamilySpaceStore((s) => s.relation);
  const shoppingItems = useShoppingListStore((s) => s.items);
  const shoppingPending = selectPendingCount(shoppingItems);
  const wishlistItems = useWishlistStore((s) => s.items);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable style={styles.headerIconBtn} onPress={onBack} hitSlop={8} accessibilityLabel="返回">
          <Ionicons name="chevron-back" size={24} color="#1a1a1a" />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          家庭空间
        </Text>
        <Pressable
          style={styles.headerIconBtn}
          onPress={() => Alert.alert("更多", "家庭设置等功能即将上线。")}
          hitSlop={8}
          accessibilityLabel="更多"
        >
          <Ionicons name="ellipsis-horizontal" size={22} color="#1a1a1a" />
        </Pressable>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={["#fff7ed", "#fef2f2"]}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroTopRow}>
            <View style={styles.heroIconWrap}>
              <Ionicons name="heart" size={24} color="#e11d48" />
            </View>
            <View style={styles.heroTitleBlock}>
              <Text style={styles.heroTitle}>家庭空间</Text>
              <Text style={styles.heroRelation}>{relationLabel(relation)}</Text>
            </View>
          </View>
          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatBlock}>
              <Text style={styles.heroStatLabel}>成员</Text>
              <Text style={styles.heroStatValue}>{memberCount}人</Text>
            </View>
            <View style={styles.heroStatBlock}>
              <Text style={styles.heroStatLabel}>本周菜单</Text>
              <Text style={styles.heroStatValue}>{weeklyDishCount}个菜</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.menuList}>
          <MenuRow
            icon="calendar-outline"
            iconBoxColor="#ffedd4"
            title="周菜单"
            subtitle={`本周已规划${weeklyDishCount}道菜`}
            onPress={onOpenWeekMenu}
          />
          <MenuRow
            icon="cart-outline"
            iconBoxColor="#dcfce7"
            title="采购清单"
            subtitle={shoppingPending === 0 ? "无待采购食材" : `${shoppingPending}种食材待采购`}
            onPress={onOpenShoppingList}
          />
          <MenuRow
            icon="bar-chart-outline"
            iconBoxColor="#f3e8ff"
            title="常做菜统计"
            subtitle="查看你们的最爱"
            onPress={onOpenFrequentDishes}
          />
          <MenuRow
            icon="heart-outline"
            iconBoxColor="#fce7f3"
            title="心愿菜池"
            subtitle={wishlistMenuSubtitle(wishlistItems)}
            onPress={onOpenWishlist}
          />
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
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 24,
    fontWeight: "500",
    color: "#1a1a1a",
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 24, gap: 24, paddingBottom: 32 },
  heroCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.08)",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    gap: 16,
  },
  heroTopRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  heroIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#ffe2e2",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitleBlock: { flex: 1, justifyContent: "center", gap: 2 },
  heroTitle: { fontSize: 18, fontWeight: "500", color: "#1a1a1a" },
  heroRelation: { fontSize: 14, color: "#757575" },
  heroStatsRow: { flexDirection: "row", alignItems: "flex-start", gap: 24 },
  heroStatBlock: { gap: 2 },
  heroStatLabel: { fontSize: 14, color: "#757575" },
  heroStatValue: { fontSize: 14, fontWeight: "500", color: "#1a1a1a" },
  menuList: { gap: 12 },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  menuRowPressed: { opacity: 0.92 },
  menuRowLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1, marginRight: 8 },
  menuIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  menuTextCol: { flex: 1, gap: 2 },
  menuTitle: { fontSize: 16, fontWeight: "500", color: "#1a1a1a" },
  menuSubtitle: { fontSize: 12, fontWeight: "500", color: "#757575" },
});
