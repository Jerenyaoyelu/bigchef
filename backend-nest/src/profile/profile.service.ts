import { Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";

const DEFAULT_USER_ID = "anonymous";

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  resolveUserId(candidate?: string) {
    const userId = candidate?.trim();
    return userId || DEFAULT_USER_ID;
  }

  async getFavorites(userId = DEFAULT_USER_ID) {
    try {
      const rows = await this.prisma.userFavorite.findMany({
        where: { userId },
        include: { dish: true },
        orderBy: { createdAt: "desc" },
      });
      return {
        list: rows.map((row) => ({
          dishId: row.dishId,
          dishName: row.dish.name,
          createdAt: row.createdAt.toISOString(),
        })),
        total: rows.length,
      };
    } catch {
      throw new ServiceUnavailableException("收藏服务暂时不可用，请稍后重试。");
    }
  }

  async addFavorite(dishId: string, userId = DEFAULT_USER_ID) {
    try {
      const dish = await this.prisma.dish.findUnique({ where: { id: dishId }, select: { id: true, name: true } });
      if (!dish) {
        throw new NotFoundException("菜谱不存在。");
      }
      await this.prisma.userFavorite.upsert({
        where: { userId_dishId: { userId, dishId } },
        update: { createdAt: new Date() },
        create: { userId, dishId },
      });
      return { dishId: dish.id, dishName: dish.name };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new ServiceUnavailableException("收藏服务暂时不可用，请稍后重试。");
    }
  }

  async removeFavorite(dishId: string, userId = DEFAULT_USER_ID) {
    try {
      await this.prisma.userFavorite.deleteMany({ where: { userId, dishId } });
      return { ok: true };
    } catch {
      throw new ServiceUnavailableException("收藏服务暂时不可用，请稍后重试。");
    }
  }

  async getHistory(userId = DEFAULT_USER_ID, limit = 20) {
    try {
      const rows = await this.prisma.userHistory.findMany({
        where: { userId },
        include: { dish: true },
        orderBy: { viewedAt: "desc" },
        take: limit,
      });
      return {
        list: rows.map((row) => ({
          dishId: row.dishId,
          dishName: row.dish.name,
          viewedAt: row.viewedAt.toISOString(),
          difficulty: row.dish.difficulty ?? 2,
        })),
        total: rows.length,
      };
    } catch {
      throw new ServiceUnavailableException("历史记录服务暂时不可用，请稍后重试。");
    }
  }

  async addHistory(dishId: string, userId = DEFAULT_USER_ID) {
    try {
      const dish = await this.prisma.dish.findUnique({ where: { id: dishId }, select: { id: true, name: true } });
      if (!dish) {
        throw new NotFoundException("菜谱不存在。");
      }
      await this.prisma.userHistory.upsert({
        where: { userId_dishId: { userId, dishId } },
        update: { viewedAt: new Date() },
        create: { userId, dishId },
      });
      return { dishId: dish.id, dishName: dish.name };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new ServiceUnavailableException("历史记录服务暂时不可用，请稍后重试。");
    }
  }

  async clearHistory(userId = DEFAULT_USER_ID) {
    try {
      await this.prisma.userHistory.deleteMany({ where: { userId } });
      return { ok: true };
    } catch {
      throw new ServiceUnavailableException("历史记录服务暂时不可用，请稍后重试。");
    }
  }
}
