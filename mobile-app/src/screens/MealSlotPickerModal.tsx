import { Pressable, Modal, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  MEAL_LABELS,
  MEAL_ORDER,
  WEEKDAY_LABELS,
  WEEKDAY_ORDER,
  type MealKind,
  type WeekdaySlot,
} from "../store/weekMenuStore";

type MealSlotPickerModalProps = {
  visible: boolean;
  title?: string;
  onClose: () => void;
  onSelect: (day: WeekdaySlot, meal: MealKind) => void;
};

export function MealSlotPickerModal({
  visible,
  title = "选择餐次",
  onClose,
  onSelect,
}: MealSlotPickerModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>{title}</Text>
          <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
            {WEEKDAY_ORDER.map((day) =>
              MEAL_ORDER.map((meal) => (
                <Pressable
                  key={`${day}_${meal}`}
                  style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                  onPress={() => {
                    onSelect(day, meal);
                    onClose();
                  }}
                >
                  <Text style={styles.rowText}>
                    {WEEKDAY_LABELS[day]}
                    {MEAL_LABELS[meal]}
                  </Text>
                </Pressable>
              )),
            )}
          </ScrollView>
          <Pressable style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>取消</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: "#fafafa",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
    maxHeight: "72%",
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 12,
  },
  list: { maxHeight: 360 },
  row: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  rowPressed: { opacity: 0.75 },
  rowText: { fontSize: 16, color: "#1a1a1a" },
  cancelBtn: {
    marginTop: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelText: { fontSize: 16, color: "#757575" },
});
