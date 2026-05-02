import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import type { MealKind, WeekdaySlot } from "../store/weekMenuStore";
import { formatWishMeta, useWishlistStore, type WishlistItem } from "../store/wishlistStore";
import { MealSlotPickerModal } from "./MealSlotPickerModal";

type WishlistPoolPageProps = {
  onBack: () => void;
};

export function WishlistPoolPage({ onBack }: WishlistPoolPageProps) {
  const items = useWishlistStore((s) => s.items);
  const addItem = useWishlistStore((s) => s.addItem);
  const removeItem = useWishlistStore((s) => s.removeItem);
  const linkToWeekMenu = useWishlistStore((s) => s.linkToWeekMenu);
  const unlinkFromWeekMenu = useWishlistStore((s) => s.unlinkFromWeekMenu);

  const [addOpen, setAddOpen] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [pickWishId, setPickWishId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = useCallback((msg: string) => setToast(msg), []);

  const onConfirmAdd = useCallback(() => {
    const t = draftName.trim();
    if (!t) return;
    addItem(t);
    setDraftName("");
    setAddOpen(false);
  }, [addItem, draftName]);

  const onPickSlot = useCallback(
    (day: WeekdaySlot, meal: MealKind) => {
      if (!pickWishId) return;
      const item = items.find((i) => i.id === pickWishId);
      linkToWeekMenu(pickWishId, day, meal);
      setPickWishId(null);
      if (item) showToast(`已将「${item.dishName}」加入下周菜单`);
    },
    [pickWishId, items, linkToWeekMenu, showToast],
  );

  const onRemoveFromMenu = useCallback(
    (item: WishlistItem) => {
      unlinkFromWeekMenu(item.id);
      showToast(`已将「${item.dishName}」从菜单移除`);
    },
    [unlinkFromWeekMenu, showToast],
  );

  const confirmDelete = useCallback(() => {
    if (!deleteId) return;
    removeItem(deleteId);
    setDeleteId(null);
  }, [deleteId, removeItem]);

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
        <Text style={styles.headerTitle}>心愿菜池</Text>
        <Pressable style={styles.headerIconBtn} onPress={() => setAddOpen(true)} hitSlop={8}>
          <Ionicons name="add" size={28} color="#1a1a1a" />
        </Pressable>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroIconBox}>
            <Ionicons name="heart" size={32} color="#e60076" />
          </View>
          <Text style={styles.heroDesc}>记录想吃的菜，随时加入周菜单</Text>
        </View>

        <View style={styles.cards}>
          {items.map((item) => {
            const linked = !!(item.linkedDay && item.linkedMeal);
            return (
              <View
                key={item.id}
                style={[styles.card, linked ? styles.cardLinked : styles.cardPlain]}
              >
                <View style={styles.cardTop}>
                  <View style={styles.cardTitleRow}>
                    <View style={styles.titleBlock}>
                      <View style={styles.nameRow}>
                        <Text
                          style={[styles.dishTitle, linked && styles.dishTitleMuted]}
                          numberOfLines={1}
                        >
                          {item.dishName}
                        </Text>
                        {linked ? (
                          <View style={styles.addedBadge}>
                            <Ionicons name="checkmark" size={12} color="#008236" />
                            <Text style={styles.addedBadgeText}>已加入</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.meta}>{formatWishMeta(item.authorLabel, item.createdAt)}</Text>
                    </View>
                    <Pressable style={styles.closeBtn} onPress={() => setDeleteId(item.id)} hitSlop={8}>
                      <Ionicons name="close" size={18} color="#9ca3af" />
                    </Pressable>
                  </View>
                </View>
                {linked ? (
                  <Pressable style={styles.grayAction} onPress={() => onRemoveFromMenu(item)}>
                    <Text style={styles.grayActionText}>从菜单移除</Text>
                  </Pressable>
                ) : (
                  <Pressable style={styles.pinkAction} onPress={() => setPickWishId(item.id)}>
                    <Text style={styles.pinkActionText}>加入下周菜单</Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>

        <View style={styles.footerTip}>
          <Text style={styles.footerTipText}>💡 把想吃但还没安排的菜加到这里，随时加入菜单</Text>
        </View>
      </ScrollView>

      <Modal visible={addOpen} transparent animationType="fade" onRequestClose={() => setAddOpen(false)}>
        <View style={styles.addRoot}>
          <Pressable style={styles.addBackdrop} onPress={() => setAddOpen(false)} />
          <View style={styles.addSheet}>
            <View style={styles.addHeader}>
              <Text style={styles.addTitle}>添加心愿菜</Text>
              <Pressable onPress={() => setAddOpen(false)} hitSlop={12}>
                <Ionicons name="close" size={22} color="#9ca3af" />
              </Pressable>
            </View>
            <TextInput
              style={styles.addInput}
              placeholder="想吃什么菜？"
              placeholderTextColor="rgba(26,26,26,0.5)"
              value={draftName}
              onChangeText={setDraftName}
            />
            <Pressable
              style={[styles.addSubmit, !draftName.trim() && styles.addSubmitDisabled]}
              disabled={!draftName.trim()}
              onPress={onConfirmAdd}
            >
              <Text style={styles.addSubmitText}>添加</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={deleteId !== null} transparent animationType="fade">
        <View style={styles.confirmRoot}>
          <Pressable style={styles.confirmBackdrop} onPress={() => setDeleteId(null)} />
          <View style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>确认删除</Text>
            <Text style={styles.confirmBody}>确定要从心愿菜池中移除这道菜吗？</Text>
            <View style={styles.confirmActions}>
              <Pressable style={styles.confirmCancel} onPress={() => setDeleteId(null)}>
                <Text style={styles.confirmCancelText}>取消</Text>
              </Pressable>
              <Pressable style={styles.confirmDanger} onPress={confirmDelete}>
                <Text style={styles.confirmDangerText}>删除</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <MealSlotPickerModal
        visible={pickWishId !== null}
        title="选择要加入的餐次"
        onClose={() => setPickWishId(null)}
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
    backgroundColor: "#fce7f3",
    alignItems: "center",
    justifyContent: "center",
  },
  heroDesc: { fontSize: 16, color: "#757575", textAlign: "center", lineHeight: 24 },
  cards: { gap: 12 },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 17,
    paddingTop: 17,
    paddingBottom: 17,
    gap: 12,
  },
  cardPlain: {
    backgroundColor: "#fff",
    borderColor: "rgba(0,0,0,0.08)",
  },
  cardLinked: {
    backgroundColor: "#f0fdf4",
    borderColor: "#b9f8cf",
    borderWidth: 1,
  },
  cardTop: {},
  cardTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  titleBlock: { flex: 1, marginRight: 8, gap: 4 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  dishTitle: { fontSize: 16, fontWeight: "500", color: "#1a1a1a", flexShrink: 1 },
  dishTitleMuted: { color: "#757575" },
  addedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#b9f8cf",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  addedBadgeText: { fontSize: 12, color: "#008236" },
  meta: { fontSize: 12, color: "#757575" },
  closeBtn: { padding: 4 },
  pinkAction: {
    backgroundColor: "#fdf2f8",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  pinkActionText: { fontSize: 14, fontWeight: "500", color: "#e60076" },
  grayAction: {
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  grayActionText: { fontSize: 14, fontWeight: "500", color: "#757575" },
  footerTip: {
    backgroundColor: "#fff3e0",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  footerTipText: { fontSize: 12, color: "#757575", textAlign: "center", lineHeight: 18 },
  addRoot: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  addBackdrop: { ...StyleSheet.absoluteFillObject },
  addSheet: {
    backgroundColor: "#fafafa",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
    gap: 16,
  },
  addHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  addTitle: { fontSize: 18, fontWeight: "600", color: "#1a1a1a" },
  addInput: {
    backgroundColor: "#fff",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(21,9,4,0.09)",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#1a1a1a",
  },
  addSubmit: {
    backgroundColor: "#ff6b35",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  addSubmitDisabled: { opacity: 0.5 },
  addSubmitText: { fontSize: 16, fontWeight: "500", color: "#fff" },
  confirmRoot: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  confirmBackdrop: { ...StyleSheet.absoluteFillObject },
  confirmBox: {
    backgroundColor: "#fafafa",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  confirmTitle: { fontSize: 18, fontWeight: "600", color: "#1a1a1a", marginBottom: 12 },
  confirmBody: { fontSize: 14, color: "#757575", lineHeight: 20, marginBottom: 20 },
  confirmActions: { flexDirection: "row", gap: 12 },
  confirmCancel: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  confirmCancelText: { fontSize: 16, fontWeight: "500", color: "#364153" },
  confirmDanger: {
    flex: 1,
    backgroundColor: "#fb2c36",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  confirmDangerText: { fontSize: 16, fontWeight: "500", color: "#fff" },
});
