import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";

import { rankedDishesFromSlots, rankAccent } from "../utils/frequentDishesStats";
import { MealSlotPickerModal } from "./MealSlotPickerModal";
import { useWeekMenuStore } from "../store/weekMenuStore";
import type { MealKind, WeekdaySlot } from "../store/weekMenuStore";
import { useFamilySpaceStore } from "../store/familySpaceStore";
import { getDishStats } from "../features/family/api/familyApi";

type FrequentDishesPageProps = {
  onBack: () => void;
};

export function FrequentDishesPage({ onBack }: FrequentDishesPageProps) {
  const slots = useWeekMenuStore((s) => s.slots);
  const setDish = useWeekMenuStore((s) => s.setDish);

  const ranked = useMemo(() => rankedDishesFromSlots(slots), [slots]);

  const [serverStats, setServerStats] = useState<Array<{ dishId: string; doneCount: number }> | null>(null);
  const familyId = useFamilySpaceStore((s) => s.familyId);

  useEffect(() => {
    if (!familyId) return;
    getDishStats(familyId, 90).then(
      (res) => setServerStats(res.items),
      () => {},
    );
  }, [familyId]);

  const [pickForDish, setPickForDish] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const onPickSlot = useCallback(
    (day: WeekdaySlot, meal: MealKind) => {
      if (!pickForDish) return;
      setDish(day, meal, pickForDish);
      setToast(`已将「${pickForDish}」加入下周菜单`);
      setPickForDish(null);
      setTimeout(() => setToast(null), 2200);
    },
    [pickForDish, setDish],
  );

  const displayList = useMemo(() => {
    if (serverStats && serverStats.length > 0) {
      return serverStats.map((item, idx) => ({
        name: item.dishId,
        count: item.doneCount,
        rank: idx + 1,
      }));
    }
    return ranked;
  }, [serverStats, ranked]);

  return (
    <SafeAreaView style={styles.safe}>
      {toast ? (
        <View style={styles.toastWrap} pointerEvents="none">
          <View style={styles.toast}>
            <Ionicons name="checkmark-circle" size={20} color="#008a2e" />
            <Text style={styles.toastText}>{toast}</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.header}>
        <Pressable style={styles.headerIconBtn} onPress={onBack} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color="#1a1a1a" />
        </Pressable>
        <Text style={styles.headerTitle}>常做菜统计</Text>
        <View style={styles.headerIconBtn} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroIconBox}>
            <Ionicons name="trending-up" size={32} color="#7c3aed" />
          </View>
          <Text style={styles.heroDesc}>统计你们最常做的菜，快速加入菜单</Text>
        </View>

        {displayList.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>先在周菜单里填写菜品，统计会按菜名出现次数排序。</Text>
          </View>
        ) : (
          <View style={styles.cardList}>
            {displayList.map((row) => (
              <View key={row.name} style={styles.statCard}>
                <View style={styles.statLeft}>
                  <Text style={[styles.rankNum, { color: rankAccent(row.rank) }]}>#{row.rank}</Text>
                  <View style={styles.statTextCol}>
                    <Text style={styles.dishName}>{row.name}</Text>
                    <Text style={styles.statSub}>
                      共做{row.count}次 · 距上次0天
                    </Text>
                  </View>
                </View>
                <Pressable style={styles.joinBtn} onPress={() => setPickForDish(row.name)}>
                  <Text style={styles.joinBtnText}>加入下周</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}

        <View style={styles.footerTip}>
          <Text style={styles.footerTipText}>💡 数据来自你们在周菜单中添加的记录</Text>
        </View>
      </ScrollView>

      <MealSlotPickerModal
        visible={pickForDish !== null}
        title="选择要加入的餐次"
        onClose={() => setPickForDish(null)}
        onSelect={onPickSlot}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fafafa" },
  toastWrap: {
    position: "absolute",
    top: 52,
    left: 16,
    right: 16,
    zIndex: 50,
    alignItems: "stretch",
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#ecfdf3",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#bffcd9",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  toastText: { flex: 1, fontSize: 13, fontWeight: "500", color: "#008a2e" },
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
  hero: { alignItems: "center", gap: 12 },
  heroIconBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: "#f3e8ff",
    alignItems: "center",
    justifyContent: "center",
  },
  heroDesc: { fontSize: 16, color: "#757575", textAlign: "center", lineHeight: 24 },
  empty: {
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e8edf3",
  },
  emptyText: { fontSize: 14, color: "#757575", textAlign: "center", lineHeight: 22 },
  cardList: { gap: 12 },
  statCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e8edf3",
    paddingHorizontal: 17,
    paddingVertical: 17,
  },
  statLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1, marginRight: 8 },
  rankNum: { fontSize: 24, fontWeight: "700", minWidth: 36 },
  statTextCol: { flex: 1, gap: 4 },
  dishName: { fontSize: 16, fontWeight: "500", color: "#1a1a1a" },
  statSub: { fontSize: 12, color: "#757575" },
  joinBtn: {
    backgroundColor: "#ff6b35",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 72,
    alignItems: "center",
  },
  joinBtnText: { fontSize: 12, fontWeight: "500", color: "#fff" },
  footerTip: {
    backgroundColor: "#fff3e0",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  footerTipText: { fontSize: 12, color: "#757575", textAlign: "center", lineHeight: 18 },
});
