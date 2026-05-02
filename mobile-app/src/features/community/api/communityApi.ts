import { deleteJson, getJson, postJson } from "../../../api/http";
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

export type CommunityPostDetail = {
  id: string;
  authorId: string;
  title: string | null;
  content: string | null;
  dishId: string | null;
  tags: string[];
  assetId: string | null;
  videoUrl: string | null;
  coverUrl: string | null;
  videoStatus: string | null;
  durationSec: number | null;
  status: string;
  likeCount: number;
  commentCount: number;
  favoriteCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CommunityComment = {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  createdAt: string;
};

export function createCommunityPost(body: {
  title?: string;
  content?: string;
  dishId?: string;
  tags?: string[];
  assetId?: string;
  status?: string;
}) {
  return postJson<CommunityPostDetail>("/api/v2/community/posts", body);
}

export function likeCommunityPost(postId: string) {
  return postJson<{ liked: boolean; likeCount: number }>(`/api/v2/community/posts/${postId}/like`, {});
}

export function unlikeCommunityPost(postId: string) {
  return deleteJson<{ liked: boolean; likeCount: number }>(`/api/v2/community/posts/${postId}/like`);
}

export function addCommunityComment(postId: string, content: string) {
  return postJson<CommunityComment>(`/api/v2/community/posts/${postId}/comments`, { content });
}

export function deleteCommunityComment(postId: string, commentId: string) {
  return deleteJson<{ ok: boolean }>(`/api/v2/community/posts/${postId}/comments/${commentId}`);
}

export function favoriteCommunityPost(postId: string) {
  return postJson<{ favorited: boolean }>(`/api/v2/community/posts/${postId}/favorite`, {});
}

export function unfavoriteCommunityPost(postId: string) {
  return deleteJson<{ favorited: boolean }>(`/api/v2/community/posts/${postId}/favorite`);
}
