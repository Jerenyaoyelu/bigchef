import { getJson } from "../../../api/http";
import type { CommunityFeedTab, CommunityListResponse } from "../../../types/api";

export async function fetchCommunityPosts(
  tab: CommunityFeedTab,
  options?: { cursor?: string | null; limit?: number },
): Promise<CommunityListResponse> {
  const limit = options?.limit ?? 20;
  const params = new URLSearchParams();
  params.set("tab", tab === "hot" ? "hot" : "latest");
  params.set("limit", String(limit));
  const c = options?.cursor;
  if (c) params.set("cursor", c);
  return getJson<CommunityListResponse>(`/api/v2/community/posts?${params.toString()}`);
}
