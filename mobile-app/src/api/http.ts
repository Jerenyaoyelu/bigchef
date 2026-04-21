import { useAppConfigStore } from "../store/appConfigStore";

export async function postJson<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const apiBaseUrl = useAppConfigStore.getState().apiBaseUrl;
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return (await response.json()) as T;
}

