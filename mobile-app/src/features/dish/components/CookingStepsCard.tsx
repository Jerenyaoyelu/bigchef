import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type CookingStepsCardProps = {
  steps: string[];
  initialMode?: "all" | "single";
};

export function CookingStepsCard({ steps, initialMode = "all" }: CookingStepsCardProps) {
  const [stepMode, setStepMode] = useState<"all" | "single">(initialMode);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  if (!steps.length) {
    return (
      <View style={styles.stepSection}>
        <View style={styles.stepHead}>
          <Text style={styles.stepTitle}>烹饪步骤</Text>
        </View>
        <Text style={styles.emptyText}>暂无步骤信息</Text>
      </View>
    );
  }

  return (
    <View style={styles.stepSection}>
      <View style={styles.stepHead}>
        <Text style={styles.stepTitle}>烹饪步骤</Text>
        <Pressable
          style={styles.stepModeButton}
          onPress={() => {
            setStepMode((prev) => (prev === "all" ? "single" : "all"));
            setCurrentStepIndex(0);
          }}
        >
          <Text style={styles.stepModeText}>☰ {stepMode === "all" ? "逐步模式" : "全部步骤"}</Text>
        </Pressable>
      </View>

      {stepMode === "all" &&
        steps.map((step, idx) => (
          <View key={`step-${idx}-${step}`} style={styles.stepItem}>
            <View style={styles.stepIndex}>
              <Text style={styles.stepIndexText}>{idx + 1}</Text>
            </View>
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}

      {stepMode === "single" && (
        <View style={styles.singleWrap}>
          <Text style={styles.singleProgress}>
            第 {currentStepIndex + 1} / {steps.length} 步
          </Text>
          <View style={styles.singleContent}>
            <View style={styles.singleIndex}>
              <Text style={styles.singleIndexText}>{currentStepIndex + 1}</Text>
            </View>
            <Text style={styles.singleText}>{steps[currentStepIndex]}</Text>
          </View>
          <View style={styles.singleActionRow}>
            <Pressable
              style={[styles.singleButtonPrev, currentStepIndex === 0 && styles.singleDisabled]}
              onPress={() => setCurrentStepIndex((idx) => Math.max(0, idx - 1))}
              disabled={currentStepIndex === 0}
            >
              <Text style={styles.singleButtonPrevText}>‹ 上一步</Text>
            </Pressable>
            <Pressable
              style={[styles.singleButtonNext, currentStepIndex === steps.length - 1 && styles.singleDisabled]}
              onPress={() => setCurrentStepIndex((idx) => Math.min(steps.length - 1, idx + 1))}
              disabled={currentStepIndex === steps.length - 1}
            >
              <Text style={styles.singleButtonNextText}>下一步 ›</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stepSection: { gap: 12 },
  stepHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  stepTitle: { fontSize: 18, color: "#1a1a1a", fontWeight: "600" },
  stepModeButton: {
    borderRadius: 999,
    backgroundColor: "rgba(255,107,53,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  stepModeText: { color: "#ff6b35", fontSize: 13, fontWeight: "500" },
  stepItem: {
    backgroundColor: "rgba(245,245,245,0.5)",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  stepIndex: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: "#ff6b35",
    alignItems: "center",
    justifyContent: "center",
  },
  stepIndexText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  stepText: { flex: 1, color: "#1a1a1a", fontSize: 15, lineHeight: 22 },
  singleWrap: { gap: 12 },
  singleProgress: { textAlign: "center", color: "#757575", fontSize: 14 },
  singleContent: {
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255,107,53,0.05)",
  },
  singleIndex: {
    width: 48,
    height: 48,
    borderRadius: 999,
    backgroundColor: "#ff6b35",
    alignItems: "center",
    justifyContent: "center",
  },
  singleIndexText: { color: "#fff", fontSize: 24, fontWeight: "500" },
  singleText: { color: "#1a1a1a", fontSize: 18, textAlign: "center", lineHeight: 30 },
  singleActionRow: { flexDirection: "row", gap: 8 },
  singleButtonPrev: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
  },
  singleButtonPrevText: { color: "#1a1a1a", fontSize: 16, fontWeight: "500" },
  singleButtonNext: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#ff6b35",
    alignItems: "center",
    justifyContent: "center",
  },
  singleButtonNextText: { color: "#fff", fontSize: 16, fontWeight: "500" },
  singleDisabled: { opacity: 0.45 },
  emptyText: { color: "#757575", fontSize: 14 },
});

