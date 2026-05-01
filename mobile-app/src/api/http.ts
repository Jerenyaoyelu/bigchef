import { useAppConfigStore } from "../store/appConfigStore";
import { useSessionStore } from "../store/sessionStore";

function getRequestHeaders() {
  const userId = useSessionStore.getState().getEffectiveUserId();
  return {
    "Content-Type": "application/json",
    ...(userId ? { "x-user-id": userId } : {}),
  };
}

export async function postJson<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const apiBaseUrl = useAppConfigStore.getState().apiBaseUrl;
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    headers: getRequestHeaders(),
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function getJson<T>(path: string): Promise<T> {
  const apiBaseUrl = useAppConfigStore.getState().apiBaseUrl;
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "GET",
    headers: getRequestHeaders(),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function deleteJson<T>(path: string): Promise<T> {
  const apiBaseUrl = useAppConfigStore.getState().apiBaseUrl;
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "DELETE",
    headers: getRequestHeaders(),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return (await response.json()) as T;
}
