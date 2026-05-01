import { Inject, Injectable, Logger } from "@nestjs/common";
import { createHash, randomUUID } from "crypto";
import { AiGenerationError } from "./ai-generation.error";
import { LlmProvider } from "./llm.provider";
import { PrismaService } from "../database/prisma.service";
import { resolvePersistIngredientRole } from "./ingredient-role.util";

/** 参与 queryHash：策略/兜底逻辑变更时递增，避免继续命中历史缓存（如旧版本地假数据）。 */
const RECOMMEND_CACHE_VERSION = "5";
const SEARCH_DISH_CACHE_VERSION = "3";

type StoredDish = {
  id: string;
  name: string;
  dishLikeCount?: number | null;
  cookTimeMinutes: number | null;
  difficulty: number | null;
  stepsSummary: unknown;
  ingredients: Array<{
    role: string;
    amountText: string | null;
    ingredient: { name: string };
  }>;
  videos: Array<{
    id: string;
    title: string;
    url: string;
    durationSec: number | null;
    likeCount: number | null;
  }>;
  _count?: { favorites: number };
};

@Injectable()
export class RecipeGenerationService {
  private readonly logger = new Logger(RecipeGenerationService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject("LLM_PROVIDER") private readonly llmProvider: LlmProvider,
  ) {}

  normalizeIngredient(name: string) {
    const v = name.trim();
    if (v === "番茄") return "西红柿";
    return v;
  }

  normalizeDishName(name: string) {
    return name.trim().replace(/\s+/g, "");
  }

  async generateRecommendWithPersistence(input: { ingredients: string[]; triggeredBy: "manual" | "db_miss" }) {
    const normalizedIngredients = input.ingredients.map((v) => this.normalizeIngredient(v)).filter(Boolean);
    const normalizedQuery = normalizedIngredients.sort().join("|");
    const queryHash = this.hash(`recommend|${RECOMMEND_CACHE_VERSION}|${normalizedQuery}`);
    const db = this.prisma as any;
    const startedAt = Date.now();

    const existingTask = await db.aiGenerationTask.findUnique({
      where: { sceneType_queryHash: { sceneType: "recommend", queryHash } },
      include: { results: true },
    });
    if (existingTask?.status === "success" && Array.isArray(existingTask.results) && existingTask.results.length > 0) {
      const ids = existingTask.results.map((r: any) => r.dishId);
      const list = await this.loadDishesByIds(ids);
      this.logger.log(`[generateRecommendWithPersistence] cache hit queryHash=${queryHash} dishIds=${JSON.stringify(ids)}`);
      return { dishes: list, aiUsed: true, generationSaved: false, source: "reuse" as const };
    }

    const task = await db.aiGenerationTask.upsert({
      where: { sceneType_queryHash: { sceneType: "recommend", queryHash } },
      update: { status: "running", errorCode: null },
      create: {
        sceneType: "recommend",
        normalizedQuery,
        queryHash,
        status: "running",
      },
    });

    try {
      const generated = await this.llmProvider.generateRecommendDishes({
        normalizedIngredients,
        count: 3,
      });
      this.logger.log(
        `[generateRecommendWithPersistence] llm source=${generated.source} dishCount=${generated.dishes.length} names=${JSON.stringify(generated.dishes.map((d) => d.dishName))}`,
      );
      const savedIds: string[] = [];
      for (const dish of generated.dishes) {
        const stored = await this.persistGeneratedDish(dish, {
          sceneType: "recommend",
          normalizedQuery,
          queryHash,
          taskId: task.id,
        });
        if (stored) savedIds.push(stored.id);
      }

      if (savedIds.length === 0) {
        throw new AiGenerationError(
          "大模型已返回内容，但未通过入库校验（步骤/食材格式等）。请稍后重试。",
          "AI_PERSIST_REJECTED",
        );
      }

      const latencyMs = Date.now() - startedAt;
      await db.aiGenerationTask.update({
        where: { id: task.id },
        data: {
          status: "success",
          model: process.env.ARK_MODEL ?? null,
          latencyMs,
          errorCode: null,
        },
      });
      const dishes = await this.loadDishesByIds(savedIds);
      return { dishes, aiUsed: true, generationSaved: true, source: generated.source };
    } catch (error) {
      const latencyMs = Date.now() - startedAt;
      const errorCode = error instanceof AiGenerationError ? error.code : "MODEL_ERROR";
      this.logger.error(
        `[generateRecommendWithPersistence] failed queryHash=${queryHash} ingredients=${JSON.stringify(normalizedIngredients)} code=${errorCode}`,
        error instanceof Error ? error.stack : String(error),
      );
      await db.aiGenerationTask.update({
        where: { id: task.id },
        data: { status: "failed", errorCode, latencyMs },
      });
      if (error instanceof AiGenerationError) {
        throw error;
      }
      throw new AiGenerationError(
        error instanceof Error ? error.message : "AI 菜谱生成失败。",
        "AI_UNKNOWN",
      );
    }
  }

  async generateSearchWithPersistence(input: { dishName: string }) {
    const normalizedDishName = this.normalizeDishName(input.dishName);
    const queryHash = this.hash(`search|${SEARCH_DISH_CACHE_VERSION}|${normalizedDishName}`);
    const db = this.prisma as any;
    const startedAt = Date.now();
    const existingTask = await db.aiGenerationTask.findUnique({
      where: { sceneType_queryHash: { sceneType: "search_dish", queryHash } },
      include: { results: true },
    });
    if (existingTask?.status === "success" && existingTask.results?.[0]?.dishId) {
      const list = await this.loadDishesByIds([existingTask.results[0].dishId]);
      return { dish: list[0] ?? null, aiUsed: true, generationSaved: false, source: "reuse" as const };
    }

    const task = await db.aiGenerationTask.upsert({
      where: { sceneType_queryHash: { sceneType: "search_dish", queryHash } },
      update: { status: "running", errorCode: null },
      create: {
        sceneType: "search_dish",
        normalizedQuery: normalizedDishName,
        queryHash,
        status: "running",
      },
    });

    try {
      const generated = await this.llmProvider.generateDishByName({ normalizedDishName });
      const stored = await this.persistGeneratedDish(generated.dish, {
        sceneType: "search_dish",
        normalizedQuery: normalizedDishName,
        queryHash,
        taskId: task.id,
      });
      if (!stored) {
        throw new AiGenerationError(
          "大模型已返回内容，但未通过入库校验。请稍后重试或更换菜名。",
          "AI_PERSIST_REJECTED",
        );
      }
      await db.aiGenerationTask.update({
        where: { id: task.id },
        data: {
          status: "success",
          errorCode: null,
          model: process.env.ARK_MODEL ?? null,
          latencyMs: Date.now() - startedAt,
        },
      });
      return { dish: stored, aiUsed: true, generationSaved: true, source: generated.source };
    } catch (error) {
      const latencyMs = Date.now() - startedAt;
      const errorCode = error instanceof AiGenerationError ? error.code : "MODEL_ERROR";
      this.logger.error(
        `[generateSearchWithPersistence] failed queryHash=${queryHash} dishName=${normalizedDishName} code=${errorCode}`,
        error instanceof Error ? error.stack : String(error),
      );
      await db.aiGenerationTask.update({
        where: { id: task.id },
        data: { status: "failed", errorCode, latencyMs },
      });
      if (error instanceof AiGenerationError) {
        throw error;
      }
      throw new AiGenerationError(
        error instanceof Error ? error.message : "AI 菜谱生成失败。",
        "AI_UNKNOWN",
      );
    }
  }

  private async persistGeneratedDish(
    dish: {
      dishName: string;
      ingredients: Array<{
        name: string;
        amount?: string;
        unit?: string;
        optional?: boolean;
        role?: unknown;
      }>;
      steps: string[];
      cookTimeMinutes?: number;
      difficulty?: number;
      tags?: string[];
    },
    ctx: { sceneType: string; normalizedQuery: string; queryHash: string; taskId: string },
  ): Promise<StoredDish | null> {
    const validSteps = dish.steps.map((v) => v.trim()).filter(Boolean);
    if (validSteps.length < 3 || validSteps.length > 8) return null;
    const validIngredients = dish.ingredients.map((v) => ({ ...v, name: v.name.trim() })).filter((v) => !!v.name);
    if (!validIngredients.length) return null;

    const generatedDishId = `dish_ai_${Date.now()}_${randomUUID().slice(0, 8)}`;
    const created = await this.prisma.$transaction(async (tx) => {
      const names = Array.from(new Set(validIngredients.map((v) => this.normalizeIngredient(v.name))));
      const existing = await tx.ingredient.findMany({ where: { name: { in: names } } });
      const existingMap = new Map(existing.map((v) => [v.name, v.id]));
      for (const name of names) {
        if (!existingMap.has(name)) {
          const row = await tx.ingredient.create({
            data: { id: `ing_${Date.now()}_${randomUUID().slice(0, 6)}`, name },
          });
          existingMap.set(name, row.id);
        }
      }
      const insertedDish = await tx.dish.create({
        data: {
          id: generatedDishId,
          name: dish.dishName,
          description: "AI generated recipe",
          sourceType: "ai_generated",
          status: "published",
          cookTimeMinutes: dish.cookTimeMinutes ?? 20,
          difficulty: dish.difficulty ?? 2,
          tasteTags: dish.tags ?? [],
          stepsSummary: validSteps,
        },
      });
      for (const [index, ing] of validIngredients.entries()) {
        const normalizedName = this.normalizeIngredient(ing.name);
        const ingredientId = existingMap.get(normalizedName);
        if (!ingredientId) continue;
        await tx.dishIngredient.create({
          data: {
            id: `di_${Date.now()}_${index}_${randomUUID().slice(0, 5)}`,
            dishId: insertedDish.id,
            ingredientId,
            role: resolvePersistIngredientRole(
              { name: normalizedName, role: ing.role },
              index,
            ),
            amountText: [ing.amount, ing.unit].filter(Boolean).join(" ").trim() || null,
          },
        });
      }

      const txx = tx as any;
      await txx.aiGenerationResult.upsert({
        where: { taskId_dishId: { taskId: ctx.taskId, dishId: insertedDish.id } },
        update: { validationResult: "approved", rawJson: dish },
        create: {
          taskId: ctx.taskId,
          dishId: insertedDish.id,
          score: 0.8,
          validationResult: "approved",
          rawJson: dish,
        },
      });
      return tx.dish.findUnique({
        where: { id: insertedDish.id },
        include: { ingredients: { include: { ingredient: true } }, videos: true },
      }) as Promise<StoredDish | null>;
    });
    return created;
  }

  private async loadDishesByIds(ids: string[]) {
    if (!ids.length) return [];
    const rows = await this.prisma.dish.findMany({
      where: { id: { in: ids } },
      include: {
        ingredients: { include: { ingredient: true } },
        videos: true,
        _count: { select: { favorites: true } },
      },
    });
    const map = new Map(rows.map((row) => [row.id, row]));
    return ids.map((id) => map.get(id)).filter(Boolean) as StoredDish[];
  }

  private hash(text: string) {
    return createHash("sha256").update(text).digest("hex");
  }
}
