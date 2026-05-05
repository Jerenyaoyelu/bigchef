import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { CommunityMediaAsset, CommunityPost } from "@prisma/client";
import { execFile } from "child_process";
import { existsSync, mkdirSync, promises as fs } from "fs";
import * as path from "path";
import { promisify } from "util";
import { PrismaService } from "../database/prisma.service";
import { TosStorageService } from "../storage/tos-storage.service";
import { MEDIA_ALLOWED_MIMES, MEDIA_MAX_BYTES, MEDIA_MAX_DURATION_SEC } from "./media-upload.constants";

const execFileAsync = promisify(execFile);

@Injectable()
export class CommunityMediaService {
  private readonly logger = new Logger(CommunityMediaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tos: TosStorageService,
  ) {}

  private uploadsRoot() {
    return path.join(process.cwd(), "uploads");
  }

  private rawPath(assetId: string) {
    return path.join(this.uploadsRoot(), "raw", `${assetId}.bin`);
  }

  private tempPlaybackPath(assetId: string) {
    return path.join(this.uploadsRoot(), "playback", `${assetId}.mp4`);
  }

  private tempCoverPath(assetId: string) {
    return path.join(this.uploadsRoot(), "covers", `${assetId}.jpg`);
  }

  ensureDirs() {
    const root = this.uploadsRoot();
    for (const sub of ["raw", "playback", "covers"]) {
      const dir = path.join(root, sub);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    }
  }

  async uploadInit(ownerId: string, payload: { fileName?: string; mimeType?: string }) {
    this.tos.ensureReady();
    this.ensureDirs();
    const asset = await this.prisma.communityMediaAsset.create({
      data: {
        ownerId,
        originFileName: payload.fileName ?? null,
        originMime: payload.mimeType ?? null,
        transcodeStatus: "pending",
      },
    });
    return {
      assetId: asset.id,
      maxBytes: MEDIA_MAX_BYTES,
      maxDurationSec: MEDIA_MAX_DURATION_SEC,
      allowedMimeTypes: MEDIA_ALLOWED_MIMES,
      upload: {
        method: "POST",
        url: `/api/v2/community/media/${asset.id}/blob`,
        fieldName: "file",
      },
    };
  }

  async saveBlob(assetId: string, ownerId: string, file: Express.Multer.File) {
    this.ensureDirs();
    const asset = await this.requireOwnedAsset(assetId, ownerId);
    if (asset.transcodeStatus !== "pending") {
      throw new BadRequestException("该资源已上传或正在处理");
    }
    if (!file?.buffer?.length) {
      throw new BadRequestException("缺少文件内容");
    }
    if (file.size > MEDIA_MAX_BYTES) {
      throw new BadRequestException("文件超过 200MB 限制");
    }
    const mime = file.mimetype;
    if (!MEDIA_ALLOWED_MIMES.includes(mime)) {
      throw new BadRequestException("仅支持 mp4 / mov");
    }

    const dest = this.rawPath(assetId);
    await fs.writeFile(dest, file.buffer);

    await this.prisma.communityMediaAsset.update({
      where: { id: assetId },
      data: {
        originSize: file.size,
        originMime: mime,
        storageKeyRaw: path.relative(this.uploadsRoot(), dest),
      },
    });

    return { ok: true, assetId };
  }

  async uploadComplete(assetId: string, ownerId: string) {
    this.tos.ensureReady();
    const asset = await this.requireOwnedAsset(assetId, ownerId);
    const raw = this.rawPath(assetId);
    if (!existsSync(raw)) {
      throw new BadRequestException("原始文件不存在，请先上传");
    }

    await this.prisma.communityMediaAsset.update({
      where: { id: assetId },
      data: { transcodeStatus: "processing", errorCode: null },
    });

    void this.runTranscodeJob(assetId).catch(async (err) => {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`转码/上传失败: ${assetId}`, message);
      await this.prisma.communityMediaAsset.update({
        where: { id: assetId },
        data: { transcodeStatus: "failed", errorCode: message.slice(0, 200) },
      });
      await this.prisma.communityPost.updateMany({
        where: { assetId },
        data: { videoStatus: "failed" },
      });
    });

    return { ok: true, assetId, transcodeStatus: "processing" };
  }

  async status(assetId: string, requesterId: string) {
    const asset = await this.requireOwnedAsset(assetId, requesterId);
    return this.serializeAsset(asset);
  }

  async retry(assetId: string, ownerId: string) {
    this.tos.ensureReady();
    const asset = await this.requireOwnedAsset(assetId, ownerId);
    if (!["failed", "pending"].includes(asset.transcodeStatus)) {
      throw new BadRequestException("当前状态不可重试");
    }
    await this.prisma.communityMediaAsset.update({
      where: { id: assetId },
      data: { transcodeStatus: "processing", errorCode: null },
    });
    void this.runTranscodeJob(assetId).catch(async (err) => {
      const message = err instanceof Error ? err.message : String(err);
      await this.prisma.communityMediaAsset.update({
        where: { id: assetId },
        data: { transcodeStatus: "failed", errorCode: message.slice(0, 200) },
      });
      await this.prisma.communityPost.updateMany({
        where: { assetId },
        data: { videoStatus: "failed" },
      });
    });
    return { ok: true, assetId, transcodeStatus: "processing" };
  }

  async presignKeys(keys: string[]): Promise<Record<string, string>> {
    this.tos.ensureReady();
    const result: Record<string, string> = {};
    for (const key of keys) {
      if (!key) continue;
      result[key] = this.tos.getPresignedUrl(key, 3600);
    }
    return result;
  }

  private async requireOwnedAsset(assetId: string, ownerId: string) {
    const asset = await this.prisma.communityMediaAsset.findUnique({ where: { id: assetId } });
    if (!asset) throw new NotFoundException("资源不存在");
    if (asset.ownerId !== ownerId) throw new NotFoundException("资源不存在");
    return asset;
  }

  private serializeAsset(asset: CommunityMediaAsset) {
    return {
      assetId: asset.id,
      transcodeStatus: asset.transcodeStatus,
      errorCode: asset.errorCode,
      durationSec: asset.durationSec,
      tosVideoKey: asset.tosVideoKey,
      tosCoverKey: asset.tosCoverKey,
    };
  }

  private async probeDurationSeconds(filePath: string) {
    try {
      const { stdout } = await execFileAsync("ffprobe", [
        "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=nw=1:nk=1",
        filePath,
      ]);
      const v = Number(String(stdout).trim());
      return Number.isFinite(v) ? v : null;
    } catch {
      return null;
    }
  }

  private async ffmpegAvailable() {
    try {
      await execFileAsync("ffmpeg", ["-version"]);
      return true;
    } catch {
      return false;
    }
  }

  private async runTranscodeJob(assetId: string) {
    const asset = await this.prisma.communityMediaAsset.findUnique({ where: { id: assetId } });
    if (!asset) throw new Error("asset not found");
    const ownerId = asset.ownerId;

    const raw = this.rawPath(assetId);
    const tempOut = this.tempPlaybackPath(assetId);
    const tempCover = this.tempCoverPath(assetId);

    const duration = await this.probeDurationSeconds(raw);
    if (duration != null && duration > MEDIA_MAX_DURATION_SEC + 0.25) {
      throw new Error(`视频时长超过 ${MEDIA_MAX_DURATION_SEC}s`);
    }

    // ffmpeg 转码到本地临时文件
    const hasFfmpeg = await this.ffmpegAvailable();
    if (hasFfmpeg) {
      await execFileAsync("ffmpeg", [
        "-y", "-i", raw,
        "-vf", "scale=-2:720",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
        "-c:a", "aac", "-b:a", "128k",
        "-movflags", "+faststart",
        tempOut,
      ]);
      try {
        await execFileAsync("ffmpeg", ["-y", "-ss", "00:00:02", "-i", raw, "-frames:v", "1", "-q:v", "2", tempCover]);
      } catch {
        await execFileAsync("ffmpeg", ["-y", "-ss", "00:00:01", "-i", tempOut, "-frames:v", "1", "-q:v", "2", tempCover]);
      }
    } else {
      await fs.copyFile(raw, tempOut);
    }

    const durationSec = duration != null ? Math.round(duration) : null;

    // 上传到 TOS（必须成功，失败直接抛错）
    const tosVideoKey = TosStorageService.buildKey("square", ownerId, ".mp4");
    await this.tos.uploadFile(tempOut, tosVideoKey, "video/mp4");

    let tosCoverKey: string | null = null;
    if (existsSync(tempCover)) {
      tosCoverKey = TosStorageService.buildKey("square", ownerId, ".jpg");
      await this.tos.uploadFile(tempCover, tosCoverKey, "image/jpeg");
    }

    this.logger.log(`TOS 上传完成: video=${tosVideoKey}, cover=${tosCoverKey}`);

    // 写入数据库
    await this.prisma.$transaction(async (tx) => {
      await tx.communityMediaAsset.update({
        where: { id: assetId },
        data: {
          transcodeStatus: "ready",
          storageKeyPlayback: null,
          coverKey: null,
          durationSec,
          errorCode: null,
          tosVideoKey,
          tosCoverKey,
        },
      });

      const post = await tx.communityPost.findFirst({ where: { assetId } });
      if (!post) return;

      const nextVideoStatus = this.resolvePlaybackVideoStatus(post);
      await tx.communityPost.update({
        where: { id: post.id },
        data: {
          videoUrl: tosVideoKey,
          coverUrl: tosCoverKey,
          durationSec: durationSec ?? post.durationSec,
          videoStatus: nextVideoStatus,
        },
      });
    });

    // 清理所有本地临时文件
    await this.cleanupLocalFiles(raw, tempOut, tempCover);
  }

  private async cleanupLocalFiles(...files: string[]) {
    for (const f of files) {
      try {
        if (existsSync(f)) await fs.unlink(f);
      } catch { /* ignore */ }
    }
  }

  private resolvePlaybackVideoStatus(post: CommunityPost) {
    if (post.moderationStatus === "blocked") return "blocked";
    if (post.moderationStatus === "pending_review") return "pending_review";
    return "ready";
  }
}
