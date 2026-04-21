import { useState } from "react";
import { Button, StyleSheet, Text, TextInput } from "react-native";
import { track } from "../../../analytics/tracker";
import { SectionCard } from "../../../components/common/SectionCard";
import { APP_CONFIG } from "../../../config/env";
import { useAppConfigStore } from "../../../store/appConfigStore";

export function ApiConfigSection() {
  if (!APP_CONFIG.isDev) return null;

  const apiBaseUrl = useAppConfigStore((s) => s.apiBaseUrl);
  const setApiBaseUrl = useAppConfigStore((s) => s.setApiBaseUrl);
  const [draftUrl, setDraftUrl] = useState(apiBaseUrl);

  function onSave() {
    setApiBaseUrl(draftUrl);
    track("api_base_url_updated", { apiBaseUrl: draftUrl });
  }

  return (
    <SectionCard title="开发配置：API 地址">
      <Text style={styles.tip}>真机调试请改为局域网地址，如 http://192.168.x.x:8000</Text>
      <TextInput value={draftUrl} onChangeText={setDraftUrl} style={styles.input} autoCapitalize="none" />
      <Button title="保存 API 地址" onPress={onSave} />
      <Text style={styles.current}>当前生效: {apiBaseUrl}</Text>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  tip: { fontSize: 12, color: "#666" },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  current: { fontSize: 12, color: "#333" },
});

