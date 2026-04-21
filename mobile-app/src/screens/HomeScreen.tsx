import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text } from "react-native";
import { APP_CONFIG } from "../config/env";
import { DishSection } from "../features/dish/components/DishSection";
import { RecommendSection } from "../features/recommend/components/RecommendSection";
import { ApiConfigSection } from "../features/settings/components/ApiConfigSection";
import { useAppConfigStore } from "../store/appConfigStore";

export function HomeScreen() {
  const [errorMessage, setErrorMessage] = useState("");
  const apiBaseUrl = useAppConfigStore((s) => s.apiBaseUrl);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>AI 做饭助手 App MVP</Text>
        <Text style={styles.hint}>当前 API 地址: {apiBaseUrl}</Text>
        {!APP_CONFIG.isDev && <Text style={styles.hint}>当前为非开发环境，API 地址由构建环境变量注入。</Text>}
        {!!errorMessage && <Text style={styles.error}>{errorMessage}</Text>}

        <ApiConfigSection />
        <RecommendSection onError={setErrorMessage} />
        <DishSection onError={setErrorMessage} />
      </ScrollView>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  content: { padding: 16, gap: 12 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 4 },
  hint: { fontSize: 12, color: "#666", marginBottom: 8 },
  error: { color: "#c62828", fontSize: 12, marginBottom: 8 },
});

