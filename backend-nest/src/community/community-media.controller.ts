import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import type { Express } from "express";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { BearerAuthGuard } from "../auth/bearer-auth.guard";
import { OptionalBearerAuthGuard } from "../auth/optional-bearer-auth.guard";
import { ReqUser, RequestUser } from "../auth/optional-user";
import { CommunityMediaService } from "./community-media.service";
import { MEDIA_MAX_BYTES } from "./media-upload.constants";

@Controller("api/v2/community/media")
export class CommunityMediaController {
  constructor(private readonly media: CommunityMediaService) {}

  @Post("upload-init")
  @UseGuards(BearerAuthGuard)
  uploadInit(@ReqUser() user: RequestUser, @Body() body: { fileName?: string; mimeType?: string }) {
    return this.media.uploadInit(user.userId, body);
  }

  @Post(":assetId/blob")
  @UseGuards(BearerAuthGuard)
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: MEDIA_MAX_BYTES },
    }),
  )
  uploadBlob(
    @Param("assetId") assetId: string,
    @ReqUser() user: RequestUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.media.saveBlob(assetId, user.userId, file);
  }

  @Post(":assetId/upload-complete")
  @UseGuards(BearerAuthGuard)
  uploadComplete(@Param("assetId") assetId: string, @ReqUser() user: RequestUser) {
    return this.media.uploadComplete(assetId, user.userId);
  }

  @Get(":assetId/status")
  @UseGuards(BearerAuthGuard)
  status(@Param("assetId") assetId: string, @ReqUser() user: RequestUser) {
    return this.media.status(assetId, user.userId);
  }

  @Post(":assetId/retry")
  @UseGuards(BearerAuthGuard)
  retry(@Param("assetId") assetId: string, @ReqUser() user: RequestUser) {
    return this.media.retry(assetId, user.userId);
  }

  /**
   * 批量预签名：传入 TOS 对象 key 列表，返回签名 URL 映射
   * GET /api/v2/community/media/presign?keys=square/xxx.mp4,square/yyy.jpg
   */
  @Get("presign")
  @UseGuards(OptionalBearerAuthGuard)
  async presign(@Query("keys") keysParam: string) {
    if (!keysParam) return {};
    const keys = keysParam.split(",").map((k) => k.trim()).filter(Boolean);
    const urls = await this.media.presignKeys(keys);
    return { urls };
  }
}
