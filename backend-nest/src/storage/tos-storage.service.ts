import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import TOS from "@volcengine/tos-sdk";
import { randomUUID } from "crypto";

@Injectable()
export class TosStorageService implements OnModuleInit {
  private readonly logger = new Logger(TosStorageService.name);
  private client: TOS | null = null;
  private bucket = "";
  private endpoint = "";
  private region = "cn-beijing";

  onModuleInit() {
    const accessKeyId = process.env.TOS_ACCESS_KEY_ID?.trim();
    const accessKeySecret = process.env.TOS_ACCESS_KEY_SECRET?.trim();
    this.bucket = process.env.TOS_BUCKET?.trim() ?? "";
    this.endpoint = process.env.TOS_ENDPOINT?.trim() ?? "";
    this.region = process.env.TOS_REGION?.trim() ?? "cn-beijing";

    if (!accessKeyId || !accessKeySecret || !this.bucket || !this.endpoint) {
      this.logger.warn("TOS 未配置，相关功能不可用。请配置 TOS_ACCESS_KEY_ID / TOS_ACCESS_KEY_SECRET / TOS_BUCKET / TOS_ENDPOINT");
      return;
    }

    this.client = new TOS({
      accessKeyId,
      accessKeySecret,
      bucket: this.bucket,
      endpoint: this.endpoint,
      region: this.region,
    });
    this.logger.log(`TOS 存储已初始化: bucket=${this.bucket}, endpoint=${this.endpoint}`);
  }

  get enabled(): boolean {
    return this.client !== null;
  }

  /**
   * 确保 TOS 已初始化，未配置时直接抛错
   */
  ensureReady(): void {
    if (!this.client) {
      throw new Error("TOS 存储未配置，请在 .env 中配置 TOS_ACCESS_KEY_ID / TOS_ACCESS_KEY_SECRET / TOS_BUCKET / TOS_ENDPOINT");
    }
  }

  /**
   * 生成 TOS 对象 key: {folder}/{userId}/{uuid}{ext}
   */
  static buildKey(folder: string, userId: string, ext: string): string {
    return `${folder}/${userId}/${randomUUID()}${ext}`;
  }

  /**
   * 将本地文件上传到 TOS
   * @returns TOS 对象 key
   */
  async uploadFile(localPath: string, objectKey: string, contentType?: string): Promise<string> {
    this.ensureReady();
    await this.client!.putObjectFromFile({
      bucket: this.bucket,
      key: objectKey,
      filePath: localPath,
      ...(contentType ? { contentType } : {}),
    });
    this.logger.log(`TOS 上传成功: ${objectKey}`);
    return objectKey;
  }

  /**
   * 生成预签名 URL（临时访问）
   */
  getPresignedUrl(objectKey: string, expires = 3600): string {
    this.ensureReady();
    return this.client!.getPreSignedUrl({
      method: "GET",
      bucket: this.bucket,
      key: objectKey,
      expires,
    });
  }

  /**
   * 删除 TOS 上的对象
   */
  async deleteObject(objectKey: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.deleteObject({
        bucket: this.bucket,
        key: objectKey,
      });
    } catch (e) {
      this.logger.warn(`TOS 删除对象失败: ${objectKey}`, (e as Error).message);
    }
  }
}
