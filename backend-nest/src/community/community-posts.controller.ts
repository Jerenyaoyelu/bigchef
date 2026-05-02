import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { BearerAuthGuard } from "../auth/bearer-auth.guard";
import { OptionalBearerAuthGuard } from "../auth/optional-bearer-auth.guard";
import { ReqUser, RequestUser } from "../auth/optional-user";
import { AddCommentDto } from "./dto/add-comment.dto";
import { CreateCommunityPostDto } from "./dto/create-post.dto";
import { PatchCommunityPostDto } from "./dto/patch-post.dto";
import { PlayMetricsDto } from "./dto/play-metrics.dto";
import { ReportPostDto } from "./dto/report-post.dto";
import { CommunityPostsService } from "./community-posts.service";

@Controller("api/v2/community/posts")
export class CommunityPostsController {
  constructor(private readonly posts: CommunityPostsService) {}

  @Get("search")
  search(@Query("q") q: string, @Query("cursor") cursor?: string, @Query("limit") limit?: string) {
    const parsedLimit = limit ? Number(limit) : 20;
    return this.posts.searchPosts({
      q: q ?? "",
      cursor,
      limit: Number.isFinite(parsedLimit) ? parsedLimit : 20,
    });
  }

  @Get("mine")
  @UseGuards(BearerAuthGuard)
  mine(
    @ReqUser() user: RequestUser,
    @Query("status") status?: string,
    @Query("cursor") cursor?: string,
    @Query("limit") limit?: string,
  ) {
    const parsedLimit = limit ? Number(limit) : 20;
    const st =
      status === "draft" || status === "published" || status === "all"
        ? (status as "draft" | "published" | "all")
        : "all";
    return this.posts.listMine({
      authorId: user.userId,
      status: st,
      cursor,
      limit: Number.isFinite(parsedLimit) ? parsedLimit : 20,
    });
  }

  @Get()
  list(@Query("tab") tab: string = "latest", @Query("cursor") cursor?: string, @Query("limit") limit?: string) {
    const parsedTab = tab === "hot" ? "hot" : "latest";
    const parsedLimit = limit ? Number(limit) : 20;
    return this.posts.listPosts({ tab: parsedTab, cursor, limit: Number.isFinite(parsedLimit) ? parsedLimit : 20 });
  }

  @Get(":id")
  @UseGuards(OptionalBearerAuthGuard)
  detail(@Param("id") id: string, @ReqUser() user?: RequestUser) {
    return this.posts.getPost(id, user?.userId);
  }

  @Post()
  @UseGuards(BearerAuthGuard)
  create(@ReqUser() user: RequestUser, @Body() body: CreateCommunityPostDto) {
    return this.posts.createPost({
      authorId: user.userId,
      title: body.title,
      content: body.content,
      dishId: body.dishId,
      tags: body.tags,
      assetId: body.assetId,
      externalVideoUrl: body.externalVideoUrl,
      coverUrl: body.coverUrl,
      status: body.status,
    });
  }

  @Patch(":id")
  @UseGuards(BearerAuthGuard)
  patch(@Param("id") id: string, @ReqUser() user: RequestUser, @Body() body: PatchCommunityPostDto) {
    return this.posts.updatePost(id, user.userId, body);
  }

  @Delete(":id")
  @UseGuards(BearerAuthGuard)
  remove(@Param("id") id: string, @ReqUser() user: RequestUser) {
    return this.posts.softDeletePost(id, user.userId);
  }

  @Post(":id/report")
  @UseGuards(BearerAuthGuard)
  report(@Param("id") id: string, @ReqUser() user: RequestUser, @Body() body: ReportPostDto) {
    return this.posts.reportPost(id, user.userId, body.reason);
  }

  @Post(":id/play-metrics")
  @UseGuards(BearerAuthGuard)
  recordPlay(@Param("id") id: string, @Body() body: PlayMetricsDto) {
    return this.posts.recordPlayMetrics(id, body.completion);
  }

  @Post(":id/like")
  @UseGuards(BearerAuthGuard)
  like(@Param("id") id: string, @ReqUser() user: RequestUser) {
    return this.posts.like(id, user.userId);
  }

  @Delete(":id/like")
  @UseGuards(BearerAuthGuard)
  unlike(@Param("id") id: string, @ReqUser() user: RequestUser) {
    return this.posts.unlike(id, user.userId);
  }

  @Post(":id/comments")
  @UseGuards(BearerAuthGuard)
  comment(@Param("id") id: string, @ReqUser() user: RequestUser, @Body() body: AddCommentDto) {
    return this.posts.addComment(id, user.userId, body.content);
  }

  @Delete(":id/comments/:commentId")
  @UseGuards(BearerAuthGuard)
  deleteComment(@Param("id") id: string, @Param("commentId") commentId: string, @ReqUser() user: RequestUser) {
    return this.posts.deleteComment(id, commentId, user.userId);
  }

  @Post(":id/favorite")
  @UseGuards(BearerAuthGuard)
  favorite(@Param("id") id: string, @ReqUser() user: RequestUser) {
    return this.posts.favorite(id, user.userId);
  }

  @Delete(":id/favorite")
  @UseGuards(BearerAuthGuard)
  unfavorite(@Param("id") id: string, @ReqUser() user: RequestUser) {
    return this.posts.unfavorite(id, user.userId);
  }
}
