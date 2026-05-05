import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";

function moderationStatusFromText(title?: string | null, content?: string | null) {
  const t = `${title ?? ""} ${content ?? ""}`;
  if (t.includes("blockedtest")) return "blocked";
  if (t.includes("reviewtest")) return "pending_review";
  return "ok";
}

function initialVideoStatus(moderationStatus: string, hasAsset: boolean) {
  if (!hasAsset) return null;
  if (moderationStatus === "blocked") return "blocked";
  if (moderationStatus === "pending_review") return "pending_review";
  return "processing";
}

function hotScore(input: {
  likeCount: number;
  commentCount: number;
  favoriteCount: number;
  completePlayRate: number;
  createdAt: Date;
}) {
  const hours = (Date.now() - input.createdAt.getTime()) / 3600000;
  return (
    input.likeCount * 1 +
    input.commentCount * 2 +
    input.favoriteCount * 2 +
    input.completePlayRate * 10 -
    hours * 0.03
  );
}

@Injectable()
export class CommunityPostsService {
  constructor(private readonly prisma: PrismaService) {}

  async createPost(params: {
    authorId: string;
    title?: string;
    content?: string;
    dishId?: string;
    tags?: string[];
    assetId?: string;
    externalVideoUrl?: string;
    coverUrl?: string;
    status?: "draft" | "published";
  }) {
    const postStatus = params.status ?? "published";
    const moderationStatus = moderationStatusFromText(params.title, params.content);
    if (params.assetId) {
      const asset = await this.prisma.communityMediaAsset.findUnique({ where: { id: params.assetId } });
      if (!asset || asset.ownerId !== params.authorId) {
        throw new BadRequestException("assetId 无效");
      }
      const existing = await this.prisma.communityPost.findUnique({ where: { assetId: params.assetId } });
      if (existing) {
        throw new BadRequestException("该视频已绑定帖子");
      }
    }

    const hasAsset = Boolean(params.assetId);
    const videoStatus = initialVideoStatus(moderationStatus, hasAsset);
    const post = await this.prisma.communityPost.create({
      data: {
        authorId: params.authorId,
        title: params.title ?? null,
        content: params.content ?? null,
        dishId: params.dishId ?? null,
        tags: params.tags ?? [],
        assetId: params.assetId ?? null,
        videoUrl: params.externalVideoUrl ?? null,
        coverUrl: params.coverUrl ?? null,
        videoStatus,
        moderationStatus,
        status: postStatus,
      },
    });

    return post;
  }

  async updatePost(
    postId: string,
    authorId: string,
    patch: Partial<{ title?: string; content?: string; dishId?: string | null; tags?: string[]; status?: "draft" | "published" }>,
  ) {
    const existing = await this.prisma.communityPost.findFirst({ where: { id: postId } });
    if (!existing) throw new NotFoundException("帖子不存在");
    if (existing.authorId !== authorId) throw new ForbiddenException("无权编辑该帖子");
    if (existing.status === "deleted") throw new BadRequestException("已删除的帖子不可编辑");

    const nextTitle = patch.title !== undefined ? patch.title : existing.title;
    const nextContent = patch.content !== undefined ? patch.content : existing.content;
    const textChanged = patch.title !== undefined || patch.content !== undefined;
    const publishTransition = patch.status === "published" && existing.status === "draft";
    const moderationStatus =
      textChanged || publishTransition ? moderationStatusFromText(nextTitle, nextContent) : existing.moderationStatus;

    const hasAsset = Boolean(existing.assetId);
    let videoStatus = existing.videoStatus;
    if (textChanged || publishTransition) {
      videoStatus = initialVideoStatus(moderationStatus, hasAsset);
    }

    return this.prisma.communityPost.update({
      where: { id: postId },
      data: {
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(patch.content !== undefined ? { content: patch.content } : {}),
        ...(patch.dishId !== undefined ? { dishId: patch.dishId } : {}),
        ...(patch.tags !== undefined ? { tags: patch.tags } : {}),
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        moderationStatus,
        ...(videoStatus !== existing.videoStatus ? { videoStatus } : {}),
      },
    });
  }

  async softDeletePost(postId: string, authorId: string) {
    const existing = await this.prisma.communityPost.findFirst({ where: { id: postId } });
    if (!existing) throw new NotFoundException("帖子不存在");
    if (existing.authorId !== authorId) throw new ForbiddenException("无权删除该帖子");
    await this.prisma.communityPost.update({
      where: { id: postId },
      data: { status: "deleted" },
    });
    return { ok: true };
  }

  async reportPost(postId: string, reporterId: string, reason: string) {
    await this.requirePublishedPost(postId);
    try {
      await this.prisma.communityPostReport.create({
        data: { postId, reporterId, reason: reason.trim() },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        return { ok: true, duplicate: true };
      }
      throw e;
    }
    return { ok: true };
  }

  async recordPlayMetrics(postId: string, completion: number) {
    const post = await this.requirePublishedPost(postId);
    const c = Math.max(0, Math.min(1, completion));
    const samples = post.playSamples + 1;
    const rate = (post.completePlayRate * post.playSamples + c) / samples;
    await this.prisma.communityPost.update({
      where: { id: postId },
      data: { completePlayRate: rate, playSamples: samples },
    });
    return { completePlayRate: rate, playSamples: samples };
  }

  async listMine(params: { authorId: string; status?: "draft" | "published" | "all"; cursor?: string; limit: number }) {
    const take = Math.min(Math.max(params.limit, 1), 50);
    const where: Prisma.CommunityPostWhereInput = {
      authorId: params.authorId,
      status: params.status === "all" || !params.status ? { not: "deleted" } : params.status,
    };
    const rows = await this.prisma.communityPost.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: take + 1,
      ...(params.cursor ? { skip: 1, cursor: { id: params.cursor } } : {}),
    });
    const hasMore = rows.length > take;
    const page = rows.slice(0, take);
    return {
      items: page.map((p) => this.serializePost(p)),
      nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null,
    };
  }

  async searchPosts(params: { q: string; cursor?: string; limit: number }) {
    const q = params.q.trim();
    if (!q) {
      return { items: [], nextCursor: null };
    }
    const take = Math.min(Math.max(params.limit, 1), 50);
    const rows = await this.prisma.communityPost.findMany({
      where: {
        status: "published",
        OR: [{ title: { contains: q, mode: "insensitive" } }, { content: { contains: q, mode: "insensitive" } }],
      },
      orderBy: { createdAt: "desc" },
      take: take + 1,
      ...(params.cursor ? { skip: 1, cursor: { id: params.cursor } } : {}),
    });
    const hasMore = rows.length > take;
    const page = rows.slice(0, take);
    return {
      items: page.map((p) => this.serializePost(p)),
      nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null,
    };
  }

  async listPosts(params: { tab: "latest" | "hot"; cursor?: string; limit: number }) {
    const take = Math.min(Math.max(params.limit, 1), 50);
    if (params.tab === "latest") {
      const rows = await this.prisma.communityPost.findMany({
        where: { status: "published" },
        orderBy: { createdAt: "desc" },
        take: take + 1,
        ...(params.cursor
          ? {
              skip: 1,
              cursor: { id: params.cursor },
            }
          : {}),
      });
      const hasMore = rows.length > take;
      const page = rows.slice(0, take);
      return {
        items: page.map((p) => this.serializePost(p)),
        nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null,
      };
    }

    const pool = await this.prisma.communityPost.findMany({
      where: { status: "published" },
      orderBy: { createdAt: "desc" },
      take: 300,
    });
    const startIndex = params.cursor ? pool.findIndex((p) => p.id === params.cursor) : -1;
    const sliced = startIndex >= 0 ? pool.slice(startIndex + 1) : pool;
    const sorted = [...sliced].sort((a, b) => hotScore(b) - hotScore(a));
    const page = sorted.slice(0, take);
    return {
      items: page.map((p) => this.serializePost(p)),
      nextCursor: sorted.length > take ? page[page.length - 1]?.id ?? null : null,
    };
  }

  async getPost(id: string, viewerUserId?: string) {
    const post = await this.prisma.communityPost.findFirst({ where: { id } });
    if (!post) throw new NotFoundException("帖子不存在");
    if (post.status === "deleted" || post.status === "draft") {
      if (!viewerUserId || viewerUserId !== post.authorId) {
        throw new NotFoundException("帖子不存在");
      }
    }
    return this.serializePost(post);
  }

  async like(postId: string, userId: string) {
    const post = await this.requirePublishedPost(postId);
    const existing = await this.prisma.communityPostLike.findUnique({
      where: { postId_userId: { postId, userId } },
    });
    if (existing) {
      return { liked: true, likeCount: post.likeCount };
    }
    await this.prisma.$transaction([
      this.prisma.communityPostLike.create({ data: { postId, userId } }),
      this.prisma.communityPost.update({
        where: { id: postId },
        data: { likeCount: { increment: 1 } },
      }),
    ]);
    return { liked: true, likeCount: post.likeCount + 1 };
  }

  async unlike(postId: string, userId: string) {
    const post = await this.requirePublishedPost(postId);
    const existing = await this.prisma.communityPostLike.findUnique({
      where: { postId_userId: { postId, userId } },
    });
    if (!existing) {
      return { liked: false, likeCount: post.likeCount };
    }
    await this.prisma.$transaction([
      this.prisma.communityPostLike.delete({ where: { id: existing.id } }),
      this.prisma.communityPost.update({
        where: { id: postId },
        data: { likeCount: { decrement: 1 } },
      }),
    ]);
    return { liked: false, likeCount: post.likeCount - 1 };
  }

  async addComment(postId: string, userId: string, content: string) {
    await this.requirePublishedPost(postId);
    const comment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.communityComment.create({
        data: { postId, authorId: userId, content },
      });
      await tx.communityPost.update({
        where: { id: postId },
        data: { commentCount: { increment: 1 } },
      });
      return created;
    });
    return comment;
  }

  async deleteComment(postId: string, commentId: string, userId: string) {
    const comment = await this.prisma.communityComment.findFirst({ where: { id: commentId, postId } });
    if (!comment) throw new NotFoundException("评论不存在");
    if (comment.authorId !== userId) throw new ForbiddenException("无权删除该评论");
    await this.prisma.$transaction([
      this.prisma.communityComment.delete({ where: { id: commentId } }),
      this.prisma.communityPost.update({
        where: { id: postId },
        data: { commentCount: { decrement: 1 } },
      }),
    ]);
    return { ok: true };
  }

  async favorite(postId: string, userId: string) {
    const post = await this.requirePublishedPost(postId);
    const existing = await this.prisma.communityPostFavorite.findUnique({
      where: { postId_userId: { postId, userId } },
    });
    if (existing) {
      return { favorited: true, favoriteCount: post.favoriteCount };
    }
    await this.prisma.$transaction([
      this.prisma.communityPostFavorite.create({ data: { postId, userId } }),
      this.prisma.communityPost.update({
        where: { id: postId },
        data: { favoriteCount: { increment: 1 } },
      }),
    ]);
    return { favorited: true, favoriteCount: post.favoriteCount + 1 };
  }

  async unfavorite(postId: string, userId: string) {
    const post = await this.requirePublishedPost(postId);
    const existing = await this.prisma.communityPostFavorite.findUnique({
      where: { postId_userId: { postId, userId } },
    });
    if (!existing) {
      return { favorited: false, favoriteCount: post.favoriteCount };
    }
    await this.prisma.$transaction([
      this.prisma.communityPostFavorite.delete({ where: { id: existing.id } }),
      this.prisma.communityPost.update({
        where: { id: postId },
        data: { favoriteCount: { decrement: 1 } },
      }),
    ]);
    return { favorited: false, favoriteCount: post.favoriteCount - 1 };
  }

  private async requirePublishedPost(postId: string) {
    const post = await this.prisma.communityPost.findFirst({ where: { id: postId, status: "published" } });
    if (!post) throw new NotFoundException("帖子不存在");
    return post;
  }

  private serializePost(post: {
    id: string;
    authorId: string;
    title: string | null;
    content: string | null;
    dishId: string | null;
    tags: unknown;
    status: string;
    videoUrl: string | null;
    coverUrl: string | null;
    videoStatus: string | null;
    durationSec: number | null;
    likeCount: number;
    commentCount: number;
    favoriteCount: number;
    completePlayRate: number;
    playSamples: number;
    createdAt: Date;
    assetId: string | null;
  }) {
    return {
      id: post.id,
      authorId: post.authorId,
      title: post.title,
      content: post.content,
      dishId: post.dishId,
      tags: post.tags,
      status: post.status,
      videoUrl: null,
      coverUrl: null,
      videoKey: post.videoUrl,   // DB 里存的就是 TOS key
      coverKey: post.coverUrl,   // DB 里存的就是 TOS key
      videoStatus: post.videoStatus,
      durationSec: post.durationSec,
      likeCount: post.likeCount,
      commentCount: post.commentCount,
      favoriteCount: post.favoriteCount,
      completePlayRate: post.completePlayRate,
      playSamples: post.playSamples,
      hotScore: hotScore(post),
      createdAt: post.createdAt,
      assetId: post.assetId,
    };
  }
}
