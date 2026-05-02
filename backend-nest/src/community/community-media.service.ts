import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { CommunityMediaAsset, CommunityPost } from "@prisma/client";
import { execFile } from "child_process";
import { createWriteStream, existsSync, mkdirSync, promises as fs } from "fs";
import * as path from "path";
import { promisify } from "util";
import { PrismaService } from "../database/prisma.service";
import { MEDIA_ALLOWED_MIMES, MEDIA_MAX_BYTES, MEDIA_MAX_DURATION_SEC } from "./media-upload.constants";

const execFileAsync = promisify(execFile);

@Injectable()
export class CommunityMediaService {
  constructor(private readonly prisma: PrismaService) {}

  private uploadsRoot() {
    return path.join(process.cwd(), "uploads");
  }

  private rawPath(assetId: string) {
    return path.join(this.uploadsRoot(), "raw", `${assetId}.bin`);
  }

  private playbackPath(assetId: string) {
    return path.join(this.uploadsRoot(), "playback", `${assetId}.mp4`);
  }

  private coverPath(assetId: string) {
    return path.join(this.uploadsRoot(), "covers", `${assetId}.jpg`);
  }

  private publicBaseUrl() {
    return process.env.PUBLIC_BASE_URL?.trim() || `http://localhost:${process.env.PORT || 8000}`;
  }

  ensureDirs() {
    const root = this.uploadsRoot();
    for (const sub of ["raw", "playback", "covers"]) {
      const dir = path.join(root, sub);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    }
  }

  async uploadInit(ownerId: string, payload: { fileName?: string; mimeType?: string }) {
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

  private async requireOwnedAsset(assetId: string, ownerId: string) {
    const asset = await this.prisma.communityMediaAsset.findUnique({ where: { id: assetId } });
    if (!asset) throw new NotFoundException("资源不存在");
    if (asset.ownerId !== ownerId) throw new NotFoundException("资源不存在");
    return asset;
  }

  private serializeAsset(asset: CommunityMediaAsset) {
    const base = this.publicBaseUrl();
    const playbackKey = asset.storageKeyPlayback;
    const coverKey = asset.coverKey;
    return {
      assetId: asset.id,
      transcodeStatus: asset.transcodeStatus,
      errorCode: asset.errorCode,
      durationSec: asset.durationSec,
      playbackUrl: playbackKey ? `${base}/media/${playbackKey.replace(/\\/g, "/")}` : null,
      coverUrl: coverKey ? `${base}/media/${coverKey.replace(/\\/g, "/")}` : null,
    };
  }

  private async probeDurationSeconds(filePath: string) {
    try {
      const { stdout } = await execFileAsync("ffprobe", [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=nw=1:nk=1",
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
    const raw = this.rawPath(assetId);
    const out = this.playbackPath(assetId);
    const cover = this.coverPath(assetId);

    const duration = await this.probeDurationSeconds(raw);
    if (duration != null && duration > MEDIA_MAX_DURATION_SEC + 0.25) {
      throw new Error(`视频时长超过 ${MEDIA_MAX_DURATION_SEC}s`);
    }

    const hasFfmpeg = await this.ffmpegAvailable();
    if (hasFfmpeg) {
      await execFileAsync("ffmpeg", [
        "-y",
        "-i",
        raw,
        "-vf",
        "scale=-2:720",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "23",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-movflags",
        "+faststart",
        out,
      ]);
      try {
        await execFileAsync("ffmpeg", ["-y", "-ss", "00:00:02", "-i", raw, "-frames:v", "1", "-q:v", "2", cover]);
      } catch {
        await execFileAsync("ffmpeg", ["-y", "-ss", "00:00:01", "-i", out, "-frames:v", "1", "-q:v", "2", cover]);
      }
    } else {
      await fs.copyFile(raw, out);
    }

    const playbackRel = path.relative(this.uploadsRoot(), out);
    const coverRel = path.relative(this.uploadsRoot(), cover);
    const durationSec = duration != null ? Math.round(duration) : null;
    const base = this.publicBaseUrl();

    await this.prisma.$transaction(async (tx) => {
      await tx.communityMediaAsset.update({
        where: { id: assetId },
        data: {
          transcodeStatus: "ready",
          storageKeyPlayback: playbackRel,
          coverKey: existsSync(cover) ? coverRel : null,
          durationSec,
          errorCode: null,
        },
      });

      const post = await tx.communityPost.findFirst({ where: { assetId } });
      if (!post) return;

      const nextVideoStatus = this.resolvePlaybackVideoStatus(post);
      await tx.communityPost.update({
        where: { id: post.id },
        data: {
          videoUrl: `${base}/media/${playbackRel.replace(/\\/g, "/")}`,
          coverUrl: existsSync(cover) ? `${base}/media/${coverRel.replace(/\\/g, "/")}` : post.coverUrl,
          durationSec: durationSec ?? post.durationSec,
          videoStatus: nextVideoStatus,
        },
      });
    });
  }

  private resolvePlaybackVideoStatus(post: CommunityPost) {
    if (post.moderationStatus === "blocked") return "blocked";
    if (post.moderationStatus === "pending_review") return "pending_review";
    return "ready";
  }

  /** 流式写入大文件时使用；MVP 可不用 */
  createRawWriteStream(assetId: string) {
    this.ensureDirs();
    return createWriteStream(this.rawPath(assetId));
  }
}
