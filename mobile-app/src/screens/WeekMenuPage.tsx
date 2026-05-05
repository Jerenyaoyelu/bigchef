import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  MEAL_LABELS,
  MEAL_ORDER,
  useWeekMenuStore,
  WEEKDAY_LABELS,
  WEEKDAY_ORDER,
  type MealKind,
  type WeekdaySlot,
} from "../store/weekMenuStore";
import { useFamilySpaceStore } from "../store/familySpaceStore";
import { upsertMenuWeek, generateWeekMenu } from "../features/family/api/familyApi";

type WeekMenuPageProps = {
  onBack: () => void;
};

const QUICK_DISHES = ["请问", "番茄炒蛋", "清炒时蔬"];

type AddTarget = { day: WeekdaySlot; meal: MealKind };

export function WeekMenuPage({ onBack }: WeekMenuPageProps) {
  const slots = useWeekMenuStore((s) => s.slots);
  const setDish = useWeekMenuStore((s) => s.setDish);

  const [addTarget, setAddTarget] = useState<AddTarget | null>(null);
  const [draftName, setDraftName] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!addTarget) return;
    const dish = slots[addTarget.day][addTarget.meal];
    setDraftName(dish ?? "");
  }, [addTarget, slots]);

  const closeModal = useCallback(() => {
    setAddTarget(null);
    setDraftName("");
  }, []);

  const onConfirmAdd = useCallback(() => {
    if (!addTarget) return;
    const name = draftName.trim();
    if (!name) return;
    setDish(addTarget.day, addTarget.meal, name);
    closeModal();
    setToastVisible(true);
  }, [addTarget, draftName, setDish, closeModal]);

  useEffect(() => {
    if (!toastVisible) return;
    const t = setTimeout(() => setToastVisible(false), 2200);
    return () => clearTimeout(t);
  }, [toastVisible]);

  useEffect(() => {
    const familyId = useFamilySpaceStore.getState().familyId;
    if (familyId) {
      useWeekMenuStore.getState().loadFromServer(familyId);
    }
  }, []);

  const confirmDisabled = !draftName.trim();

  return (
    <SafeAreaView style={styles.safe}>
      {toastVisible ? (
        <View style={styles.toastWrap} pointerEvents="none">
          <View style={styles.toast}>
            <Text style={styles.toastText}>已更新菜单</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.header}>
        <Pressable style={styles.headerIconBtn} onPress={onBack} hitSlop={8} accessibilityLabel="返回">
          <Ionicons name="chevron-back" size={24} color="#1a1a1a" />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          周菜单
        </Text>
        <View style={styles.headerIconBtn} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={20} color="#1447e6" style={styles.infoIcon} />
          <Text style={styles.infoBannerText}>
            可随时调整菜单，不需要对方确认。点「通知看一眼」提醒对方关注即可
          </Text>
        </View>

        <View style={styles.dayCardList}>
          {WEEKDAY_ORDER.map((day) => (
            <View key={day} style={styles.dayCard}>
              <Text style={styles.dayTitle}>{WEEKDAY_LABELS[day]}</Text>
              <View style={styles.mealBlock}>
                {MEAL_ORDER.map((meal) => {
                  const dish = slots[day][meal];
                  const filled = !!dish?.trim();
                  return (
                    <Pressable
                      key={meal}
                      style={({ pressed }) => [styles.mealRow, pressed && styles.mealRowPressed]}
                      onPress={() => setAddTarget({ day, meal })}
                    >
                      <View style={styles.mealRowLeft}>
                        <Text style={styles.mealKind}>{MEAL_LABELS[meal]}</Text>
                        <Text
                          style={[styles.mealStatus, filled && styles.mealStatusFilled]}
                          numberOfLines={1}
                        >
                          {filled ? dish : "未安排"}
                        </Text>
                      </View>
                      <View style={styles.addCircle}>
                        <Ionicons name="add" size={16} color="#6b7280" />
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </View>

        <View style={styles.bottomActions}>
          <Pressable
            style={({ pressed }) => [styles.aiBtn, pressed && styles.primaryBtnPressed]}
            onPress={async () => {
              const familyId = useFamilySpaceStore.getState().familyId;
              if (!familyId) {
                Alert.alert("提示", "请先创建或加入家庭");
                return;
              }
              setGenerating(true);
              try {
                const week = await upsertMenuWeek(familyId);
                const plans = await generateWeekMenu(familyId, week.id, true);
                Alert.alert("生成成功", `已生成 ${plans.length} 道菜品`);
                useWeekMenuStore.getState().loadFromServer(familyId);
              } catch {
                Alert.alert("生成失败", "请稍后重试");
              } finally {
                setGenerating(false);
              }
            }}
          >
            <Ionicons name="sparkles" size={20} color="#fff" />
            <Text style={styles.aiBtnText}>{generating ? "生成中..." : "一键生成一周菜单（AI）"}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.notifyBtn, pressed && styles.primaryBtnPressed]}
            onPress={() => Alert.alert("通知已发送", "对方将在下次打开时收到提醒")}
          >
            <Text style={styles.notifyBtnText}>通知对方看一眼</Text>
          </Pressable>
        </View>

        <View style={styles.footerTip}>
          <Text style={styles.footerTipText}>
            💡 生成的菜单会自动合并到采购清单，也可以从常做菜快速添加
          </Text>
        </View>
      </ScrollView>

      <Modal visible={addTarget !== null} transparent animationType="fade" onRequestClose={closeModal}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdropFill} onPress={closeModal} accessibilityRole="button" />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                {addTarget
                  ? `选择${WEEKDAY_LABELS[addTarget.day]}${MEAL_LABELS[addTarget.meal]}的菜品`
                  : ""}
              </Text>
              <Pressable onPress={closeModal} hitSlop={12}>
                <Text style={styles.sheetClose}>✕</Text>
              </Pressable>
            </View>
            <TextInput
              style={styles.input}
              placeholder="输入菜名"
              placeholderTextColor="#9ca3af"
              value={draftName}
              onChangeText={setDraftName}
            />
            <Text style={styles.sheetSectionLabel}>从常做菜选择</Text>
            <View style={styles.chips}>
              {QUICK_DISHES.map((d) => (
                <Pressable key={d} style={styles.chip} onPress={() => setDraftName(d)}>
                  <Text style={styles.chipText}>{d}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              style={[styles.sheetConfirm, confirmDisabled && styles.sheetConfirmDisabled]}
              disabled={confirmDisabled}
              onPress={onConfirmAdd}
            >
              <Text style={[styles.sheetConfirmText, confirmDisabled && styles.sheetConfirmTextDisabled]}>确认</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fafafa" },
  toastWrap: {
    position: "absolute",
    top: 52,
    left: 0,
    right: 0,
    zIndex: 50,
    alignItems: "center",
  },
  toast: {
    backgroundColor: "#22c55e",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  toastText: { color: "#fff", fontSize: 14, fontWeight: "600" },
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
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#eff6ff",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#bedbff",
    borderRadius: 16,
    paddingHorizontal: 17,
    paddingVertical: 17,
  },
  infoIcon: { marginTop: 2 },
  infoBannerText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: "#1447e6",
  },
  dayCardList: { gap: 16 },
  dayCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e8edf3",
    paddingHorizontal: 17,
    paddingTop: 17,
    paddingBottom: 17,
    gap: 12,
  },
  dayTitle: { fontSize: 16, fontWeight: "500", color: "#1a1a1a" },
  mealBlock: { gap: 8 },
  mealRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 12,
    minHeight: 36,
  },
  mealRowPressed: { backgroundColor: "rgba(0,0,0,0.02)" },
  mealRowLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginRight: 8,
  },
  mealKind: {
    width: 40,
    fontSize: 12,
    color: "#757575",
  },
  mealStatus: {
    flex: 1,
    fontSize: 14,
    color: "#757575",
  },
  mealStatusFilled: {
    color: "#1a1a1a",
    fontWeight: "500",
  },
  addCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  bottomActions: { gap: 12 },
  primaryBtnPressed: { opacity: 0.92 },
  aiBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#ff6b35",
    borderRadius: 16,
    paddingVertical: 16,
    shadowColor: "#ff6b35",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  aiBtnText: { color: "#fff", fontSize: 16, fontWeight: "500" },
  notifyBtn: {
    backgroundColor: "#4ecdc4",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  notifyBtnText: { color: "#fff", fontSize: 16, fontWeight: "500" },
  footerTip: {
    backgroundColor: "#fff3e0",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  footerTipText: {
    fontSize: 12,
    lineHeight: 16,
    color: "#757575",
    textAlign: "center",
  },
  modalRoot: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalBackdropFill: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sheetTitle: { fontSize: 17, fontWeight: "700", color: "#111", flex: 1, paddingRight: 8 },
  sheetClose: { fontSize: 20, color: "#9ca3af" },
  input: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111",
    marginBottom: 16,
  },
  sheetSectionLabel: { fontSize: 13, color: "#6b7280", marginBottom: 10 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  chipText: { fontSize: 14, color: "#374151" },
  sheetConfirm: {
    backgroundColor: "#ff6b35",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  sheetConfirmDisabled: { opacity: 0.45 },
  sheetConfirmText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  sheetConfirmTextDisabled: { color: "#fff" },
});
