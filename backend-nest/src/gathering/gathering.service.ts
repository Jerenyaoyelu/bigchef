import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { randomBytes } from "crypto";
import { PrismaService } from "../database/prisma.service";

@Injectable()
export class GatheringService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertMember(gatheringId: string, userId: string) {
    const member = await this.prisma.gatheringMember.findFirst({ where: { gatheringId, userId } });
    if (!member) throw new ForbiddenException("无权访问该聚餐");
    return member;
  }

  async create(userId: string, payload: { headcount: number; title?: string }) {
    if (payload.headcount < 1 || payload.headcount > 50) {
      throw new BadRequestException("headcount 不合法");
    }
    const shareToken = randomBytes(16).toString("hex");
    const gathering = await this.prisma.gathering.create({
      data: {
        creatorId: userId,
        headcount: payload.headcount,
        title: payload.title ?? null,
        shareToken,
        members: { create: { userId } },
      },
    });
    return gathering;
  }

  async join(userId: string, shareToken: string) {
    const gathering = await this.prisma.gathering.findUnique({ where: { shareToken: shareToken.trim() } });
    if (!gathering) throw new NotFoundException("邀请无效");
    if (gathering.status === "closed") throw new BadRequestException("聚餐已结束");
    await this.prisma.gatheringMember.upsert({
      where: { gatheringId_userId: { gatheringId: gathering.id, userId } },
      create: { gatheringId: gathering.id, userId },
      update: {},
    });
    return { gatheringId: gathering.id };
  }

  async get(gatheringId: string, userId: string) {
    await this.assertMember(gatheringId, userId);
    return this.prisma.gathering.findUnique({
      where: { id: gatheringId },
      include: { wishes: true, members: true },
    });
  }

  async addWish(gatheringId: string, userId: string, payload: { dishId?: string; freeText?: string }) {
    await this.assertMember(gatheringId, userId);
    if (!payload.dishId && !payload.freeText) {
      throw new BadRequestException("需要提供 dishId 或 freeText");
    }
    return this.prisma.gatheringWish.create({
      data: {
        gatheringId,
        userId,
        dishId: payload.dishId ?? null,
        freeText: payload.freeText ?? null,
      },
    });
  }

  async generateMenu(gatheringId: string, userId: string) {
    const gathering = await this.prisma.gathering.findUnique({ where: { id: gatheringId } });
    if (!gathering) throw new NotFoundException("聚餐不存在");
    if (gathering.creatorId !== userId) throw new ForbiddenException("仅发起人可生成菜单");
    const wishes = await this.prisma.gatheringWish.findMany({ where: { gatheringId }, orderBy: { createdAt: "asc" } });
    const items = wishes.map((w, idx) => ({
      order: idx + 1,
      dishId: w.dishId,
      freeText: w.freeText,
      suggestedForPeople: gathering.headcount,
    }));
    return this.prisma.gathering.update({
      where: { id: gatheringId },
      data: { status: "generated", menuItems: items },
    });
  }

  async patchGathering(
    gatheringId: string,
    userId: string,
    payload: Partial<{
      beveragePresets: string[];
      beverageNote: string;
      includeBeverageInShopping: boolean;
      menuItems: unknown;
      shoppingList: unknown;
      status: string;
    }>,
  ) {
    const gathering = await this.prisma.gathering.findUnique({ where: { id: gatheringId } });
    if (!gathering) throw new NotFoundException("聚餐不存在");
    if (gathering.creatorId !== userId) throw new ForbiddenException("仅发起人可修改聚餐设置");
    return this.prisma.gathering.update({
      where: { id: gatheringId },
      data: {
        ...(payload.beveragePresets != null ? { beveragePresets: payload.beveragePresets } : {}),
        ...(payload.beverageNote != null ? { beverageNote: payload.beverageNote } : {}),
        ...(payload.includeBeverageInShopping != null ? { includeBeverageInShopping: payload.includeBeverageInShopping } : {}),
        ...(payload.menuItems != null ? { menuItems: payload.menuItems as object } : {}),
        ...(payload.shoppingList != null ? { shoppingList: payload.shoppingList as object } : {}),
        ...(payload.status != null ? { status: payload.status } : {}),
      },
    });
  }

  async generateShoppingList(gatheringId: string, userId: string) {
    await this.assertMember(gatheringId, userId);
    const gathering = await this.prisma.gathering.findUnique({ where: { id: gatheringId } });
    if (!gathering) throw new NotFoundException("聚餐不存在");

    const dishIds = new Set<string>();
    const rawMenu = gathering.menuItems;
    if (Array.isArray(rawMenu)) {
      for (const row of rawMenu) {
        if (row && typeof row === "object" && "dishId" in row && typeof (row as { dishId: unknown }).dishId === "string") {
          dishIds.add((row as { dishId: string }).dishId);
        }
      }
    }
    const wishes = await this.prisma.gatheringWish.findMany({ where: { gatheringId } });
    for (const w of wishes) {
      if (w.dishId) dishIds.add(w.dishId);
    }

    const links = await this.prisma.dishIngredient.findMany({
      where: { dishId: { in: [...dishIds] } },
      include: { ingredient: true },
    });

    const merged = new Map<string, { displayName: string; quantities: string[]; category?: string | null }>();
    for (const row of links) {
      const key = row.ingredientId;
      const name = row.ingredient.name;
      const bucket = merged.get(key) ?? { displayName: name, quantities: [], category: row.ingredient.category };
      if (row.amountText) bucket.quantities.push(row.amountText);
      merged.set(key, bucket);
    }

    type Row = {
      ingredientKey: string;
      displayName: string;
      quantity: string | null;
      category: string | null;
    };
    const items: Row[] = [...merged.entries()].map(([ingredientKey, v]) => ({
      ingredientKey,
      displayName: v.displayName,
      quantity: v.quantities.length ? v.quantities.join(" + ") : null,
      category: v.category ?? null,
    }));

    if (gathering.includeBeverageInShopping && Array.isArray(gathering.beveragePresets)) {
      for (const name of gathering.beveragePresets) {
        if (typeof name === "string" && name.trim()) {
          const n = name.trim();
          items.push({
            ingredientKey: `beverage:${n}`,
            displayName: n,
            quantity: null,
            category: "饮品",
          });
        }
      }
    }
    if (gathering.includeBeverageInShopping && gathering.beverageNote?.trim()) {
      items.push({
        ingredientKey: "beverage:note",
        displayName: gathering.beverageNote.trim(),
        quantity: null,
        category: "饮品",
      });
    }

    const payload = { generatedAt: new Date().toISOString(), items };
    return this.prisma.gathering.update({
      where: { id: gatheringId },
      data: { shoppingList: payload },
    });
  }

  async close(gatheringId: string, userId: string) {
    const gathering = await this.prisma.gathering.findUnique({ where: { id: gatheringId } });
    if (!gathering) throw new NotFoundException("聚餐不存在");
    if (gathering.creatorId !== userId) throw new ForbiddenException("仅发起人可关闭聚餐");
    return this.prisma.gathering.update({ where: { id: gatheringId }, data: { status: "closed" } });
  }
}
