import { Ionicons } from "@expo/vector-icons";
import { Fragment } from "react";
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  groupItemsByCategorySorted,
  selectPendingCount,
  SHOPPING_CATEGORY_LABEL,
  useShoppingListStore,
  type ShoppingItem,
} from "../store/shoppingListStore";

type ShoppingListPageProps = {
  onBack: () => void;
  /** 从临时聚餐进入：仅单次采购，不展示两阶段切换 */
  gatheringSingleList?: boolean;
};

export function ShoppingListPage({ onBack, gatheringSingleList }: ShoppingListPageProps) {
  const purchaseMode = useShoppingListStore((s) => s.purchaseMode);
  const items = useShoppingListStore((s) => s.items);
  const setPurchaseMode = useShoppingListStore((s) => s.setPurchaseMode);
  const toggleChecked = useShoppingListStore((s) => s.toggleChecked);
  const markAtHome = useShoppingListStore((s) => s.markAtHome);

  const pending = selectPendingCount(items);

  const phase1Items = items.filter((i) => i.phase === 1);
  const phase2Items = items.filter((i) => i.phase === 2);

  const showSingleList = gatheringSingleList || purchaseMode === "single";

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable style={styles.headerIconBtn} onPress={onBack} hitSlop={8} accessibilityLabel="返回">
          <Ionicons name="chevron-back" size={24} color="#1a1a1a" />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          采购清单
        </Text>
        <Pressable
          style={styles.headerIconBtn}
          onPress={() => Alert.alert("筛选", "筛选功能即将上线。")}
          hitSlop={8}
          accessibilityLabel="筛选"
        >
          <Ionicons name="funnel-outline" size={22} color="#1a1a1a" />
        </Pressable>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {gatheringSingleList ? null : (
          <View style={styles.segment}>
            <Pressable
              style={[styles.segmentBtn, purchaseMode === "single" ? styles.segmentBtnActive : styles.segmentBtnIdle]}
              onPress={() => setPurchaseMode("single")}
            >
              <Text style={[styles.segmentText, purchaseMode === "single" && styles.segmentTextActive]}>单次采购</Text>
            </Pressable>
            <Pressable
              style={[styles.segmentBtn, purchaseMode === "twoStage" ? styles.segmentBtnActive : styles.segmentBtnIdle]}
              onPress={() => setPurchaseMode("twoStage")}
            >
              <Text style={[styles.segmentText, purchaseMode === "twoStage" && styles.segmentTextActive]}>两阶段采购</Text>
            </Pressable>
          </View>
        )}

        {gatheringSingleList ? (
          <View style={styles.hintGreen}>
            <Text style={styles.hintGreenText}>💡 临时聚餐：单次采购即可，开餐前一次性备齐食材与酒水。</Text>
          </View>
        ) : purchaseMode === "single" ? (
          <View style={styles.hintGreen}>
            <Text style={styles.hintGreenText}>💡 建议周末采购，可覆盖下周5天晚餐</Text>
          </View>
        ) : (
          <View style={styles.twoHints}>
            <View style={styles.hintBlue}>
              <Text style={styles.hintBlueText}>📅 第一次采购（周三）：易腐食材，前3天菜品</Text>
            </View>
            <View style={styles.hintPurple}>
              <Text style={styles.hintPurpleText}>📅 第二次采购（周六）：耐储食材，后2天菜品</Text>
            </View>
          </View>
        )}

        {showSingleList ? (
          <View style={styles.categorizedWrap}>
            {groupItemsByCategorySorted(items).map(({ category, items: catItems }) => (
              <View key={category} style={styles.categoryBlock}>
                <View style={styles.categoryHeaderRow}>
                  <View style={styles.categoryBar} />
                  <Text style={styles.categoryLabel}>{SHOPPING_CATEGORY_LABEL[category]}</Text>
                </View>
                <View style={styles.listGap}>
                  {catItems.map((item) => (
                    <Fragment key={item.id}>
                      {item.checked ? (
                        <DoneRow item={item} onToggle={() => toggleChecked(item.id)} />
                      ) : (
                        <PendingRowSingle item={item} onToggle={() => toggleChecked(item.id)} onAtHome={() => markAtHome(item.id)} />
                      )}
                    </Fragment>
                  ))}
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.twoStageSections}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: "#2b7fff" }]} />
              <Text style={styles.sectionTitle}>第一次采购（周三）</Text>
            </View>
            <View style={styles.categorizedWrap}>
              {groupItemsByCategorySorted(phase1Items).map(({ category, items: catItems }) => (
                <View key={`p1-${category}`} style={styles.categoryBlock}>
                  <View style={styles.categoryHeaderRow}>
                    <View style={[styles.categoryBar, styles.categoryBarPhase1]} />
                    <Text style={styles.categoryLabel}>{SHOPPING_CATEGORY_LABEL[category]}</Text>
                  </View>
                  <View style={styles.listGap}>
                    {catItems.map((item) => (
                      <Fragment key={item.id}>
                        {item.checked ? (
                          <DoneRow item={item} onToggle={() => toggleChecked(item.id)} />
                        ) : (
                          <PendingRowPhase phase={1} item={item} onToggle={() => toggleChecked(item.id)} onAtHome={() => markAtHome(item.id)} />
                        )}
                      </Fragment>
                    ))}
                  </View>
                </View>
              ))}
            </View>

            <View style={[styles.sectionHeader, styles.sectionHeaderSecond]}>
              <View style={[styles.sectionDot, { backgroundColor: "#ad46ff" }]} />
              <Text style={styles.sectionTitle}>第二次采购（周六）</Text>
            </View>
            <View style={styles.categorizedWrap}>
              {groupItemsByCategorySorted(phase2Items).map(({ category, items: catItems }) => (
                <View key={`p2-${category}`} style={styles.categoryBlock}>
                  <View style={styles.categoryHeaderRow}>
                    <View style={[styles.categoryBar, styles.categoryBarPhase2]} />
                    <Text style={styles.categoryLabel}>{SHOPPING_CATEGORY_LABEL[category]}</Text>
                  </View>
                  <View style={styles.listGap}>
                    {catItems.map((item) => (
                      <Fragment key={item.id}>
                        {item.checked ? (
                          <DoneRow item={item} onToggle={() => toggleChecked(item.id)} />
                        ) : (
                          <PendingRowPhase phase={2} item={item} onToggle={() => toggleChecked(item.id)} onAtHome={() => markAtHome(item.id)} />
                        )}
                      </Fragment>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.footerBar}>
          <Text style={styles.footerLeft}>待采购</Text>
          <Text style={styles.footerRight}>{pending} 种食材</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function DoneRow({ item, onToggle }: { item: ShoppingItem; onToggle: () => void }) {
  return (
    <Pressable style={styles.rowDone} onPress={onToggle}>
      <View style={styles.checkOn}>
        <Ionicons name="checkmark" size={12} color="#fff" />
      </View>
      <Text style={styles.labelDone} numberOfLines={1}>
        {item.label}
      </Text>
    </Pressable>
  );
}

function PendingRowSingle({
  item,
  onToggle,
  onAtHome,
}: {
  item: ShoppingItem;
  onToggle: () => void;
  onAtHome: () => void;
}) {
  return (
    <View style={styles.rowPending}>
      <Pressable style={styles.checkOff} onPress={onToggle} hitSlop={6} />
      <Text style={styles.labelPending} numberOfLines={1}>
        {item.label}
      </Text>
      <Pressable style={styles.atHomeBtn} onPress={onAtHome}>
        <Text style={styles.atHomeText}>家里已有</Text>
      </Pressable>
    </View>
  );
}

function PendingRowPhase({
  phase,
  item,
  onToggle,
  onAtHome,
}: {
  phase: 1 | 2;
  item: ShoppingItem;
  onToggle: () => void;
  onAtHome: () => void;
}) {
  const cardStyle = phase === 1 ? styles.rowPhase1 : styles.rowPhase2;
  const checkStyle = phase === 1 ? styles.checkPhase1 : styles.checkPhase2;
  return (
    <View style={[styles.rowPending, cardStyle]}>
      <Pressable style={[styles.checkOff, checkStyle]} onPress={onToggle} hitSlop={6} />
      <Text style={styles.labelPending} numberOfLines={1}>
        {item.label}
      </Text>
      <Pressable style={styles.atHomeBtn} onPress={onAtHome}>
        <Text style={styles.atHomeText}>家里已有</Text>
      </Pressable>
    </View>
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
  scrollContent: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 40, gap: 24 },
  segment: { flexDirection: "row", gap: 8 },
  segmentBtn: {
    flex: 1,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentBtnActive: { backgroundColor: "#ff6b35" },
  segmentBtnIdle: { backgroundColor: "#f3f4f6" },
  segmentText: { fontSize: 14, fontWeight: "500", color: "#757575" },
  segmentTextActive: { color: "#fff" },
  hintGreen: {
    backgroundColor: "#f0fdf4",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  hintGreenText: { fontSize: 14, lineHeight: 20, color: "#008236" },
  twoHints: { gap: 12 },
  hintBlue: {
    backgroundColor: "#eff6ff",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  hintBlueText: { fontSize: 14, lineHeight: 20, color: "#1447e6" },
  hintPurple: {
    backgroundColor: "#faf5ff",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  hintPurpleText: { fontSize: 14, lineHeight: 20, color: "#8200db" },
  listGap: { gap: 12 },
  categorizedWrap: { gap: 20 },
  categoryBlock: { gap: 8 },
  categoryHeaderRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 4 },
  categoryBar: {
    width: 3,
    height: 14,
    borderRadius: 2,
    backgroundColor: "#ff6b35",
  },
  categoryBarPhase1: { backgroundColor: "#2b7fff" },
  categoryBarPhase2: { backgroundColor: "#ad46ff" },
  categoryLabel: { fontSize: 15, fontWeight: "600", color: "#374151" },
  twoStageSections: { gap: 16 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionHeaderSecond: { marginTop: 8 },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { fontSize: 18, fontWeight: "500", color: "#1a1a1a" },
  rowDone: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#f9fafb",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  checkOn: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: "#ff6b35",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ff6b35",
    alignItems: "center",
    justifyContent: "center",
  },
  labelDone: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    color: "#1a1a1a",
    opacity: 0.5,
    textDecorationLine: "line-through",
  },
  rowPending: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.08)",
    paddingHorizontal: 13,
    paddingVertical: 13,
  },
  rowPhase1: {
    borderColor: "#bedbff",
    borderWidth: 1,
  },
  rowPhase2: {
    borderColor: "#e9d4ff",
    borderWidth: 1,
  },
  checkOff: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#d1d5dc",
  },
  checkPhase1: {
    borderColor: "#51a2ff",
  },
  checkPhase2: {
    borderColor: "#c27aff",
  },
  labelPending: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    color: "#1a1a1a",
  },
  atHomeBtn: {
    backgroundColor: "#f3f4f6",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    minWidth: 72,
    alignItems: "center",
  },
  atHomeText: { fontSize: 12, fontWeight: "500", color: "#757575" },
  footerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff3e0",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginTop: 4,
  },
  footerLeft: { fontSize: 14, color: "#757575" },
  footerRight: { fontSize: 14, fontWeight: "500", color: "#1a1a1a" },
});
