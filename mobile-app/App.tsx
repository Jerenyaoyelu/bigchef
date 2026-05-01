import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { HomeScreen } from "./src/screens/HomeScreen";
import { useSessionStore } from "./src/store/sessionStore";

export default function App() {
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await useSessionStore.persist.rehydrate();
      if (cancelled) return;
      useSessionStore.getState().ensureGuestId();
      if (!cancelled) setSessionReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!sessionReady) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fafafa" }}>
        <ActivityIndicator size="large" color="#ff6b35" />
      </View>
    );
  }

  return <HomeScreen />;
}
