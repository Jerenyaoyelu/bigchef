import { deleteJson, getJson, postJson, uploadFormData } from "../../../api/http";
import type { CommunityFeedTab, CommunityListResponse } from "../../../types/api";

export type UploadInitResponse = {
  assetId: string;
  maxBytes: number;
  maxDurationSec: number;
  allowedMimeTypes: string[];
  upload: { method: string; url: string; fieldName: string };
};

export type AssetStatusResponse = {
  assetId: string;
  transcodeStatus: string;
  errorCode: string | null;
  durationSec: number | null;
  playbackUrl: string | null;
  coverUrl: string | null;
};

export async function mediaUploadInit(payload: { fileName?: string; mimeType?: string }): Promise<UploadInitResponse> {
  return postJson<UploadInitResponse>("/api/v2/community/media/upload-init", payload as Record<string, unknown>);
}

export async function mediaUploadBlob(assetId: string, fileUri: string, fileName: string, mimeType: string) {
  const formData = new FormData();
  formData.append("file", { uri: fileUri, name: fileName, type: mimeType } as unknown as Blob);
  return uploadFormData<{ ok: boolean; assetId: string }>(
    `/api/v2/community/media/${assetId}/blob`,
    formData,
  );
}

export async function mediaUploadComplete(assetId: string) {
  return postJson<{ ok: boolean; assetId: string; transcodeStatus: string }>(
    `/api/v2/community/media/${assetId}/upload-complete`,
    {},
  );
}

export async function mediaAssetStatus(assetId: string): Promise<AssetStatusResponse> {
  return getJson<AssetStatusResponse>(`/api/v2/community/media/${assetId}/status`);
}

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

/**
 * 批量获取 TOS 预签名 URL
 * @param keys TOS 对象 key 列表
 * @returns key → 签名 URL 映射
 */
export async function presignMediaKeys(keys: string[]): Promise<Record<string, string>> {
  if (!keys.length) return {};
  const params = new URLSearchParams();
  params.set("keys", keys.join(","));
  const res = await getJson<{ urls: Record<string, string> }>(
    `/api/v2/community/media/presign?${params.toString()}`,
  );
  return res.urls ?? {};
}
