import { Injectable, UnauthorizedException } from "@nestjs/common";
import { randomBytes } from "crypto";
import { PrismaService } from "../database/prisma.service";

const ACCESS_EXPIRE_MS = 2 * 60 * 60 * 1000;
const REFRESH_EXPIRE_MS = 14 * 24 * 60 * 60 * 1000;
const SMS_EXPIRE_MS = 5 * 60 * 1000;
const DEV_SMS_CODE = "123456";

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async sendSms(phone: string) {
    const db = this.prisma as any;
    const now = new Date();
    await db.authSmsCode.create({
      data: {
        phone,
        code: DEV_SMS_CODE,
        expiredAt: new Date(now.getTime() + SMS_EXPIRE_MS),
      },
    });
    return {
      success: true,
      bizCode: "SMS_SENT",
      expiresInSec: SMS_EXPIRE_MS / 1000,
      mockCode: DEV_SMS_CODE,
    };
  }

  async smsLogin(phone: string, code: string) {
    const db = this.prisma as any;
    const latest = await db.authSmsCode.findFirst({
      where: { phone },
      orderBy: { createdAt: "desc" },
    });
    const now = new Date();
    if (!latest || latest.code !== code || latest.expiredAt <= now) {
      throw new UnauthorizedException("验证码无效或已过期");
    }

    await db.authSmsCode.update({
      where: { id: latest.id },
      data: { verifiedAt: now },
    });

    const userId = `user_${phone}`;
    const accessToken = this.newToken("atk");
    const refreshToken = this.newToken("rtk");
    const accessExpiredAt = new Date(now.getTime() + ACCESS_EXPIRE_MS);
    const refreshExpiredAt = new Date(now.getTime() + REFRESH_EXPIRE_MS);

    await db.authSession.create({
      data: {
        userId,
        phone,
        accessToken,
        refreshToken,
        accessExpiredAt,
        refreshExpiredAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresInSec: ACCESS_EXPIRE_MS / 1000,
      user: { userId, phone, isGuest: false },
    };
  }

  async refresh(refreshToken: string) {
    const db = this.prisma as any;
    const session = await db.authSession.findUnique({ where: { refreshToken } });
    const now = new Date();
    if (!session || session.refreshExpiredAt <= now) {
      throw new UnauthorizedException("refresh token 无效或已过期");
    }
    const nextAccessToken = this.newToken("atk");
    const nextAccessExpiredAt = new Date(now.getTime() + ACCESS_EXPIRE_MS);
    await db.authSession.update({
      where: { id: session.id },
      data: {
        accessToken: nextAccessToken,
        accessExpiredAt: nextAccessExpiredAt,
      },
    });
    return {
      accessToken: nextAccessToken,
      refreshToken: session.refreshToken,
      expiresInSec: ACCESS_EXPIRE_MS / 1000,
    };
  }

  async me(accessToken: string) {
    const session = await this.getValidSessionByAccessToken(accessToken);
    return {
      userId: session.userId,
      phone: session.phone,
      isGuest: false,
    };
  }

  async resolveUserIdFromAccessToken(accessToken: string) {
    const session = await this.getValidSessionByAccessToken(accessToken);
    return session.userId;
  }

  async upgradeGuestData(guestId: string, userId: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      const guestFavorites = await tx.userFavorite.findMany({ where: { userId: guestId } });
      const userFavorites = await tx.userFavorite.findMany({ where: { userId } });
      const userFavoriteSet = new Set(userFavorites.map((row) => row.dishId));
      let migratedFavorites = 0;
      let dedupFavorites = 0;
      for (const row of guestFavorites) {
        if (userFavoriteSet.has(row.dishId)) {
          dedupFavorites += 1;
          continue;
        }
        await tx.userFavorite.upsert({
          where: { userId_dishId: { userId, dishId: row.dishId } },
          update: { createdAt: row.createdAt },
          create: { userId, dishId: row.dishId, createdAt: row.createdAt },
        });
        migratedFavorites += 1;
      }

      const guestHistory = await tx.userHistory.findMany({ where: { userId: guestId } });
      const userHistory = await tx.userHistory.findMany({ where: { userId } });
      const userHistorySet = new Set(userHistory.map((row) => row.dishId));
      let migratedHistory = 0;
      let dedupHistory = 0;
      for (const row of guestHistory) {
        if (userHistorySet.has(row.dishId)) {
          dedupHistory += 1;
          continue;
        }
        await tx.userHistory.upsert({
          where: { userId_dishId: { userId, dishId: row.dishId } },
          update: { viewedAt: row.viewedAt },
          create: { userId, dishId: row.dishId, viewedAt: row.viewedAt },
        });
        migratedHistory += 1;
      }
      return {
        migrated: { favorites: migratedFavorites, history: migratedHistory },
        deduplicated: { favorites: dedupFavorites, history: dedupHistory },
      };
    });

    return { success: true, ...result };
  }

  private async getValidSessionByAccessToken(accessToken: string) {
    const db = this.prisma as any;
    const session = await db.authSession.findUnique({ where: { accessToken } });
    if (!session || session.accessExpiredAt <= new Date()) {
      throw new UnauthorizedException("access token 无效或已过期");
    }
    return session;
  }

  private newToken(prefix: string) {
    return `${prefix}_${randomBytes(24).toString("hex")}`;
  }
}
