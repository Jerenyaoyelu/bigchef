import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { randomBytes } from "crypto";
import { RecipeGenerationService } from "../ai/recipe-generation.service";
import { PrismaService } from "../database/prisma.service";

function randomInviteCode() {
  return randomBytes(4).toString("hex").toUpperCase();
}

function startOfWeekUtcMonday(reference = new Date()) {
  const d = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate()));
  const day = d.getUTCDay();
  const diff = (day + 6) % 7;
  d.setUTCDate(d.getUTCDate() - diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

@Injectable()
export class FamilyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly recipeGeneration: RecipeGenerationService,
  ) {}

  private async assertFamilyMember(familyId: string, userId: string, roles?: string[]) {
    const member = await this.prisma.familyMember.findFirst({ where: { familyId, userId } });
    if (!member) throw new ForbiddenException("无权访问该家庭");
    if (roles?.length && !roles.includes(member.role)) {
      throw new ForbiddenException("权限不足");
    }
    return member;
  }

  private async assertNotInOtherFamily(userId: string) {
    const existing = await this.prisma.familyMember.findFirst({ where: { userId } });
    if (existing) {
      throw new BadRequestException("你已加入家庭，需先退出后再创建/加入其他家庭");
    }
  }

  async createFamily(userId: string, payload: { name: string; householdRelation: "couple" | "roommates" }) {
    await this.assertNotInOtherFamily(userId);
    const family = await this.prisma.family.create({
      data: {
        name: payload.name,
        ownerId: userId,
        inviteCode: randomInviteCode(),
        householdRelation: payload.householdRelation,
        members: {
          create: { userId, role: "owner" },
        },
      },
    });
    return family;
  }

  async joinFamily(userId: string, inviteCode: string) {
    await this.assertNotInOtherFamily(userId);
    const family = await this.prisma.family.findUnique({ where: { inviteCode: inviteCode.trim() } });
    if (!family) throw new NotFoundException("邀请码无效");
    await this.prisma.familyMember.create({
      data: { familyId: family.id, userId, role: "member" },
    });
    return { familyId: family.id };
  }

  async getFamily(familyId: string, userId: string) {
    await this.assertFamilyMember(familyId, userId);
    return this.prisma.family.findUnique({
      where: { id: familyId },
      include: { members: true },
    });
  }

  async patchFamily(
    familyId: string,
    userId: string,
    payload: Partial<{
      name: string;
      householdRelation: "couple" | "roommates";
      collaborationMode: "couple_flexible" | "household_explicit";
      hostOnlyEdit: boolean;
    }>,
  ) {
    await this.assertFamilyMember(familyId, userId, ["owner", "admin"]);
    return this.prisma.family.update({
      where: { id: familyId },
      data: {
        ...(payload.name != null ? { name: payload.name } : {}),
        ...(payload.householdRelation != null ? { householdRelation: payload.householdRelation } : {}),
        ...(payload.collaborationMode != null ? { collaborationMode: payload.collaborationMode } : {}),
        ...(payload.hostOnlyEdit != null ? { hostOnlyEdit: payload.hostOnlyEdit } : {}),
      },
    });
  }

  async upsertMenuWeek(familyId: string, userId: string, weekStartInput?: string) {
    await this.assertFamilyMember(familyId, userId);
    const weekStart = weekStartInput ? new Date(weekStartInput) : startOfWeekUtcMonday();
    weekStart.setUTCHours(0, 0, 0, 0);
    return this.prisma.familyMenuWeek.upsert({
      where: { familyId_weekStart: { familyId, weekStart } },
      create: { familyId, weekStart },
      update: {},
    });
  }

  async listMenuWeeks(familyId: string, userId: string) {
    await this.assertFamilyMember(familyId, userId);
    return this.prisma.familyMenuWeek.findMany({
      where: { familyId },
      orderBy: { weekStart: "desc" },
      take: 24,
    });
  }

  async getMenuWeek(familyId: string, weekId: string, userId: string) {
    await this.assertFamilyMember(familyId, userId);
    const week = await this.prisma.familyMenuWeek.findFirst({
      where: { id: weekId, familyId },
      include: { mealPlans: { orderBy: { date: "asc" } } },
    });
    if (!week) throw new NotFoundException("周菜单不存在");
    return week;
  }

  async getShoppingList(familyId: string, listId: string, userId: string) {
    await this.assertFamilyMember(familyId, userId);
    const list = await this.prisma.familyShoppingList.findFirst({
      where: { id: listId, familyId },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    });
    if (!list) throw new NotFoundException("清单不存在");
    return list;
  }

  async patchMenuWeek(familyId: string, weekId: string, userId: string, payload: { status?: string }) {
    const member = await this.assertFamilyMember(familyId, userId);
    const week = await this.prisma.familyMenuWeek.findFirst({ where: { id: weekId, familyId } });
    if (!week) throw new NotFoundException("周菜单不存在");
    const family = await this.prisma.family.findUnique({ where: { id: familyId } });
    if (family?.hostOnlyEdit && !["owner", "admin"].includes(member.role)) {
      throw new ForbiddenException("仅主持人可编辑周菜单");
    }
    return this.prisma.familyMenuWeek.update({
      where: { id: weekId },
      data: { ...(payload.status != null ? { status: payload.status } : {}) },
    });
  }

  async addMealPlan(
    familyId: string,
    userId: string,
    payload: { menuWeekId: string; dishId: string; date: string; assigneeUserId?: string },
  ) {
    const member = await this.assertFamilyMember(familyId, userId);
    const week = await this.prisma.familyMenuWeek.findFirst({ where: { id: payload.menuWeekId, familyId } });
    if (!week) throw new NotFoundException("周菜单不存在");
    const family = await this.prisma.family.findUnique({ where: { id: familyId } });
    if (family?.hostOnlyEdit && !["owner", "admin"].includes(member.role)) {
      throw new ForbiddenException("仅主持人可编辑周菜单");
    }
    return this.prisma.familyMealPlan.create({
      data: {
        familyId,
        menuWeekId: payload.menuWeekId,
        dishId: payload.dishId,
        date: new Date(payload.date),
        assigneeUserId: payload.assigneeUserId ?? null,
        status: "planned",
      },
    });
  }

  async patchMealPlan(
    familyId: string,
    planId: string,
    userId: string,
    payload: Partial<{ status: "planned" | "done"; assigneeUserId: string | null; date: string; dishId: string }>,
  ) {
    await this.assertFamilyMember(familyId, userId);
    const plan = await this.prisma.familyMealPlan.findFirst({ where: { id: planId, familyId } });
    if (!plan) throw new NotFoundException("计划不存在");
    return this.prisma.familyMealPlan.update({
      where: { id: planId },
      data: {
        ...(payload.status != null ? { status: payload.status } : {}),
        ...(payload.assigneeUserId !== undefined ? { assigneeUserId: payload.assigneeUserId } : {}),
        ...(payload.date != null ? { date: new Date(payload.date) } : {}),
        ...(payload.dishId != null ? { dishId: payload.dishId } : {}),
      },
    });
  }

  async listWishes(familyId: string, userId: string) {
    await this.assertFamilyMember(familyId, userId);
    return this.prisma.familyDishWish.findMany({ where: { familyId, status: "active" }, orderBy: { createdAt: "desc" } });
  }

  async addWish(familyId: string, userId: string, payload: { dishId: string; note?: string }) {
    await this.assertFamilyMember(familyId, userId);
    return this.prisma.familyDishWish.create({
      data: { familyId, userId, dishId: payload.dishId, note: payload.note ?? null },
    });
  }

  async deleteWish(familyId: string, wishId: string, userId: string) {
    await this.assertFamilyMember(familyId, userId);
    const wish = await this.prisma.familyDishWish.findFirst({ where: { id: wishId, familyId } });
    if (!wish) throw new NotFoundException("心愿不存在");
    if (wish.userId !== userId) throw new ForbiddenException("只能删除自己的心愿");
    await this.prisma.familyDishWish.delete({ where: { id: wishId } });
    return { ok: true };
  }

  async statsDishes(familyId: string, userId: string, windowDays: number) {
    await this.assertFamilyMember(familyId, userId);
    const days = Math.min(Math.max(windowDays || 30, 1), 365);
    const since = new Date(Date.now() - days * 86400000);
    const rows = await this.prisma.familyMealPlan.groupBy({
      by: ["dishId"],
      where: { familyId, status: "done", date: { gte: since } },
      _count: { dishId: true },
    });
    const sorted = [...rows].sort((a, b) => b._count.dishId - a._count.dishId);
    return { windowDays: days, items: sorted.map((r) => ({ dishId: r.dishId, doneCount: r._count.dishId })) };
  }

  async generateShoppingList(familyId: string, menuWeekId: string, userId: string, mode: "single" | "two_phase" = "single") {
    await this.assertFamilyMember(familyId, userId);
    const week = await this.prisma.familyMenuWeek.findFirst({ where: { id: menuWeekId, familyId } });
    if (!week) throw new NotFoundException("周菜单不存在");

    const plans = await this.prisma.familyMealPlan.findMany({ where: { menuWeekId } });
    const dishIds = [...new Set(plans.map((p) => p.dishId))];
    const links = await this.prisma.dishIngredient.findMany({
      where: { dishId: { in: dishIds } },
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

    const list = await this.prisma.familyShoppingList.create({
      data: {
        familyId,
        menuWeekId,
        mode,
        items: {
          create: [...merged.entries()].map(([ingredientKey, v], index) => ({
            ingredientKey,
            displayName: v.displayName,
            quantity: v.quantities.length ? v.quantities.join(" + ") : null,
            unit: null,
            category: v.category ?? null,
            batchIndex: mode === "two_phase" ? index % 2 : 0,
            sortOrder: index,
          })),
        },
      },
      include: { items: true },
    });

    return list;
  }

  async patchShoppingList(
    familyId: string,
    listId: string,
    userId: string,
    payload: { items?: Array<Partial<{ id: string; purchased: boolean; excludedReason: string | null }>> },
  ) {
    await this.assertFamilyMember(familyId, userId);
    const list = await this.prisma.familyShoppingList.findFirst({ where: { id: listId, familyId } });
    if (!list) throw new NotFoundException("清单不存在");

    if (payload.items?.length) {
      for (const item of payload.items) {
        if (!item.id) continue;
        if (item.purchased === true) {
          await this.prisma.familyShoppingListItem.updateMany({
            where: { id: item.id, listId },
            data: { purchasedAt: new Date(), purchasedByUserId: userId },
          });
        }
        if (item.purchased === false) {
          await this.prisma.familyShoppingListItem.updateMany({
            where: { id: item.id, listId },
            data: { purchasedAt: null, purchasedByUserId: null },
          });
        }
        if (item.excludedReason !== undefined) {
          await this.prisma.familyShoppingListItem.updateMany({
            where: { id: item.id, listId },
            data: { excludedReason: item.excludedReason },
          });
        }
      }
    }

    return this.prisma.familyShoppingList.findUnique({ where: { id: listId }, include: { items: true } });
  }

  async generateWeekMenuFromWishes(
    familyId: string,
    menuWeekId: string,
    userId: string,
    options?: { useAiFill?: boolean },
  ) {
    const member = await this.assertFamilyMember(familyId, userId);
    const week = await this.prisma.familyMenuWeek.findFirst({ where: { id: menuWeekId, familyId } });
    if (!week) throw new NotFoundException("周菜单不存在");
    const family = await this.prisma.family.findUnique({ where: { id: familyId } });
    if (family?.hostOnlyEdit && !["owner", "admin"].includes(member.role)) {
      throw new ForbiddenException("仅主持人可生成菜单");
    }

    const wishes = await this.prisma.familyDishWish.findMany({
      where: { familyId, status: "active" },
      orderBy: { createdAt: "asc" },
    });
    const uniqueWishes = [...new Set(wishes.map((w) => w.dishId))];

    const since = new Date(Date.now() - 90 * 86400000);
    const statRows = await this.prisma.familyMealPlan.groupBy({
      by: ["dishId"],
      where: { familyId, status: "done", date: { gte: since } },
      _count: { dishId: true },
    });
    const statSorted = [...statRows].sort((a, b) => b._count.dishId - a._count.dishId);
    const statIds = statSorted.map((r) => r.dishId);

    const popular = await this.prisma.dish.findMany({
      orderBy: { dishLikeCount: "desc" },
      take: 40,
      select: { id: true },
    });

    let fillerPool = [...statIds, ...popular.map((p) => p.id)];
    fillerPool = [...new Set(fillerPool)];

    if (options?.useAiFill) {
      const seedDishIds = uniqueWishes.length ? uniqueWishes.slice(0, 3) : fillerPool.slice(0, 3);
      const ingredientRows =
        seedDishIds.length > 0
          ? await this.prisma.dishIngredient.findMany({
              where: { dishId: { in: seedDishIds } },
              take: 12,
              include: { ingredient: true },
            })
          : [];
      const ingNames = [...new Set(ingredientRows.map((r) => r.ingredient.name).filter(Boolean))];
      const ingredientsForAi =
        ingNames.length >= 2 ? ingNames.slice(0, 4) : ["猪肉", "青菜", "鸡蛋"].slice(0, 3);
      try {
        const rec = await this.recipeGeneration.generateRecommendWithPersistence({
          ingredients: ingredientsForAi,
          triggeredBy: "manual",
        });
        for (const d of rec.dishes) {
          if (!fillerPool.includes(d.id)) fillerPool.push(d.id);
        }
      } catch {
        /* LLM 不可用时仍用统计与热门 */
      }
    }

    if (uniqueWishes.length === 0 && fillerPool.length === 0) {
      throw new BadRequestException("没有可用菜品（请先添加心愿或确保系统有菜品数据）");
    }

    const slots: string[] = [];
    const nWish = uniqueWishes.length;
    for (let d = 0; d < 7; d += 1) {
      if (d < nWish) {
        slots.push(uniqueWishes[d]!);
      } else {
        const prev = d > 0 ? slots[d - 1] : null;
        const pick = fillerPool.find((id) => id !== prev) ?? fillerPool[0];
        if (!pick) {
          throw new BadRequestException("无法补全周菜单，请开启 useAiFill 或补充菜品数据");
        }
        slots.push(pick);
      }
    }

    await this.prisma.familyMealPlan.deleteMany({ where: { menuWeekId } });

    const start = week.weekStart;
    const entries = slots.map((dishId, d) => {
      const day = new Date(start);
      day.setUTCDate(start.getUTCDate() + d);
      return { dishId, date: day };
    });

    await this.prisma.$transaction(
      entries.map((e) =>
        this.prisma.familyMealPlan.create({
          data: {
            familyId,
            menuWeekId,
            dishId: e.dishId,
            date: e.date,
            status: "planned",
          },
        }),
      ),
    );

    await this.prisma.familyMenuWeek.update({
      where: { id: menuWeekId },
      data: { lastGeneratedAt: new Date() },
    });

    return this.prisma.familyMealPlan.findMany({ where: { menuWeekId }, orderBy: { date: "asc" } });
  }

  async addCheckin(
    familyId: string,
    userId: string,
    payload: { dishId?: string; menuWeekId?: string; content?: string; mediaUrl?: string },
  ) {
    await this.assertFamilyMember(familyId, userId);
    return this.prisma.familyCheckin.create({
      data: {
        familyId,
        userId,
        dishId: payload.dishId ?? null,
        menuWeekId: payload.menuWeekId ?? null,
        content: payload.content ?? null,
        mediaUrl: payload.mediaUrl ?? null,
      },
    });
  }

  async listCheckins(familyId: string, userId: string, limit = 30) {
    await this.assertFamilyMember(familyId, userId);
    const take = Math.min(Math.max(limit, 1), 100);
    return this.prisma.familyCheckin.findMany({
      where: { familyId },
      orderBy: { createdAt: "desc" },
      take,
    });
  }
}
