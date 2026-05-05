import { useAppConfigStore } from "../store/appConfigStore";
import { useSessionStore } from "../store/sessionStore";

function getAuthHeaders(): Record<string, string> {
  const { accessToken } = useSessionStore.getState();
  if (accessToken) {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    };
  }
  const userId = useSessionStore.getState().getEffectiveUserId();
  return {
    "Content-Type": "application/json",
    ...(userId ? { "x-user-id": userId } : {}),
  };
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 401) {
    // 尝试 refresh
    const refreshed = await tryRefresh();
    if (refreshed) {
      throw new Error("RETRY_AFTER_REFRESH");
    }
    // refresh 也失败，清除登录态
    useSessionStore.getState().setAuthUserId(null);
    useSessionStore.getState().setTokens(null, null);
    throw new Error("HTTP 401");
  }
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return (await response.json()) as T;
}

async function tryRefresh(): Promise<boolean> {
  const { refreshToken } = useSessionStore.getState();
  if (!refreshToken) return false;
  try {
    const apiBaseUrl = useAppConfigStore.getState().apiBaseUrl;
    const resp = await fetch(`${apiBaseUrl}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!resp.ok) return false;
    const data = (await resp.json()) as { accessToken: string; refreshToken: string };
    useSessionStore.getState().setTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

async function requestWithRetry<T>(method: string, path: string, body?: Record<string, unknown>): Promise<T> {
  const apiBaseUrl = useAppConfigStore.getState().apiBaseUrl;
  const url = `${apiBaseUrl}${path}`;
  const headers = getAuthHeaders();

  const response = await fetch(url, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  try {
    return await handleResponse<T>(response);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "RETRY_AFTER_REFRESH") {
      const retryHeaders = getAuthHeaders();
      const retryResp = await fetch(url, {
        method,
        headers: retryHeaders,
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      return handleResponse<T>(retryResp);
    }
    throw e;
  }
}

export async function postJson<T>(path: string, body: Record<string, unknown>): Promise<T> {
  return requestWithRetry<T>("POST", path, body);
}

export async function getJson<T>(path: string): Promise<T> {
  return requestWithRetry<T>("GET", path);
}

export async function deleteJson<T>(path: string): Promise<T> {
  return requestWithRetry<T>("DELETE", path);
}

export async function patchJson<T>(path: string, body: Record<string, unknown>): Promise<T> {
  return requestWithRetry<T>("PATCH", path, body);
}

export async function putJson<T>(path: string, body: Record<string, unknown>): Promise<T> {
  return requestWithRetry<T>("PUT", path, body);
}

export async function uploadFormData<T>(path: string, formData: FormData): Promise<T> {
  const apiBaseUrl = useAppConfigStore.getState().apiBaseUrl;
  const url = `${apiBaseUrl}${path}`;
  const { accessToken } = useSessionStore.getState();
  const headers: Record<string, string> = accessToken
    ? { Authorization: `Bearer ${accessToken}` }
    : {};

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: formData,
  });

  try {
    return await handleResponse<T>(response);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "RETRY_AFTER_REFRESH") {
      const newToken = useSessionStore.getState().accessToken;
      const retryHeaders: Record<string, string> = newToken
        ? { Authorization: `Bearer ${newToken}` }
        : {};
      const retryResp = await fetch(url, {
        method: "POST",
        headers: retryHeaders,
        body: formData,
      });
      return handleResponse<T>(retryResp);
    }
    throw e;
  }
}
