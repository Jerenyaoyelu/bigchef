import { HttpException, Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { AiGenerationError } from "../ai/ai-generation.error";
import { RecipeGenerationService } from "../ai/recipe-generation.service";
import { PrismaService } from "../database/prisma.service";

@Injectable()
export class RecommendService {
  private readonly logger = new Logger(RecommendService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly recipeGenerationService: RecipeGenerationService,
  ) {}

  /** 与用户输入一致：番茄 → 西红柿 */
  private normalizePantryToken(item: string) {
    const t = item.trim();
    if (!t) return t;
    return t === "番茄" ? "西红柿" : t;
  }

  /** 去掉「猪肉（带皮五花肉）」等括号说明，便于与用户已填「猪肉」对齐 */
  private stripIngredientQualifier(name: string) {
    return name.replace(/[（(][^）)]*[）)]/g, "").trim();
  }

  /**
   * 用户已有食材是否覆盖菜谱中的某一料名（非精确字符串时才需要，例如 猪肉 vs 猪肉（带皮五花肉））。
   * 仍要求 pantry 词长度 ≥2 才做子串匹配，避免误匹配过短词。
   */
  private ingredientSatisfiedByPantry(pantry: Set<string>, ingredientName: string) {
    const name = this.normalizePantryToken(ingredientName);
    if (!name) return true;
    const base = this.normalizePantryToken(this.stripIngredientQualifier(name));
    for (const p of pantry) {
      const pt = this.normalizePantryToken(p);
      if (!pt) continue;
      if (name === pt || base === pt) return true;
      if (pt.length >= 2 && (name.includes(pt) || base.includes(pt))) return true;
    }
    return false;
  }

  /** 缺料列表（仅主料、辅料；调料不参与），并保留 role 供前端区分展示 */
  private missingIngredientsForDish(
    rows: Array<{ role: string; ingredient: { name: string } }>,
    pantry: Set<string>,
  ): Array<{ name: string; role: "main" | "secondary" }> {
    const out: Array<{ name: string; role: "main" | "secondary" }> = [];
    for (const item of rows) {
      if (item.role !== "main" && item.role !== "secondary") continue;
      const name = item.ingredient.name;
      if (this.ingredientSatisfiedByPantry(pantry, name)) continue;
      if (item.role === "main") out.push({ name, role: "main" });
      else out.push({ name, role: "secondary" });
    }
    return out;
  }

  /** 与缺料、匹配分一致：主料+辅料（不含调料） */
  private ingredientNamesForMatch(rows: Array<{ role: string; ingredient: { name: string } }>) {
    return rows.filter((item) => item.role !== "seasoning").map((item) => item.ingredient.name);
  }

  /**
   * 在 Ingredient 表上按用户食材做粗筛（精确或 name 包含），再反查关联菜谱。
   * 避免无 where 的 take(20) 随机抽样导致永远抽不到含「猪肉」的 AI 菜。
   */
  private async ingredientIdsMatchingPantry(pantry: Set<string>): Promise<string[]> {
    if (!pantry.size) return [];
    const orClause: Prisma.IngredientWhereInput[] = [];
    for (const raw of pantry) {
      const p = this.normalizePantryToken(raw);
      if (!p) continue;
      orClause.push({ name: p });
      if (p.length >= 2) {
        orClause.push({ name: { contains: p } });
      }
    }
    if (!orClause.length) return [];
    const rows = await this.prisma.ingredient.findMany({
      where: { OR: orClause },
      select: { id: true },
    });
    return [...new Set(rows.map((r) => r.id))];
  }

  async byIngredients(ingredients: string[], page = 1, pageSize = 10, aiBoost = false) {
    const normalized = new Set(
      ingredients
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => this.normalizePantryToken(item)),
    );

    let dbResult: ReturnType<RecommendService["computeMatches"]>;
    try {
      const candidateIngredientIds = await this.ingredientIdsMatchingPantry(normalized);
      const dishes =
        !normalized.size || !candidateIngredientIds.length
          ? []
          : await this.prisma.dish.findMany({
              where: {
                status: "published",
                ingredients: { some: { ingredientId: { in: candidateIngredientIds } } },
              },
              include: {
                ingredients: { include: { ingredient: true } },
                videos: true,
              },
              orderBy: { id: "desc" },
              take: 120,
            });

      const fromDb = dishes.map((dish) => {
        const ingredientsForMatch = this.ingredientNamesForMatch(dish.ingredients);
        const missingIngredients = this.missingIngredientsForDish(dish.ingredients, normalized);
        return {
          dishId: dish.id,
          dishName: dish.name,
          ingredientsForMatch,
          missingIngredients,
          cookTimeMinutes: dish.cookTimeMinutes ?? 20,
          difficulty: dish.difficulty ?? 2,
          videos: dish.videos.map((video) => ({
            videoId: video.id,
            title: video.title,
            url: video.url,
            durationSec: video.durationSec ?? 0,
            likeCount: video.likeCount ?? 0,
          })),
        };
      });

      dbResult = this.computeMatches(fromDb, normalized, page, pageSize, aiBoost);
    } catch (error) {
      this.logger.error(
        `Recommend DB failed. ingredients=${JSON.stringify(Array.from(normalized))}`,
        error instanceof Error ? error.stack : JSON.stringify(error),
      );
      throw new ServiceUnavailableException("数据库服务暂时不可用，请稍后重试。");
    }

    if (dbResult.total > 0 && !aiBoost) {
      return {
        ...dbResult,
        list: dbResult.list.map((item) => ({ ...item, entrySource: "db" as const })),
      };
    }

    try {
      const aiFallback = await this.recipeGenerationService.generateRecommendWithPersistence({
        ingredients: Array.from(normalized),
        triggeredBy: dbResult.total > 0 && aiBoost ? "manual" : "db_miss",
      });
      if (!aiFallback.dishes.length) {
        throw new ServiceUnavailableException("未能加载 AI 推荐结果，请稍后重试。");
      }

      const generated = aiFallback.dishes.map((dish) => {
        const namesForMatch = this.ingredientNamesForMatch(dish.ingredients);
        const missingIngredients = this.missingIngredientsForDish(dish.ingredients, normalized);
        const hit = namesForMatch.filter((item) => this.ingredientSatisfiedByPantry(normalized, item)).length;
        const score = namesForMatch.length > 0 ? Number((hit / namesForMatch.length).toFixed(2)) : 0;
        return {
          dishId: dish.id,
          dishName: dish.name,
          missingIngredients,
          cookTimeMinutes: dish.cookTimeMinutes ?? 20,
          difficulty: dish.difficulty ?? 2,
          videos: dish.videos.map((video) => ({
            videoId: video.id,
            title: video.title,
            url: video.url,
            durationSec: video.durationSec ?? 0,
            likeCount: video.likeCount ?? 0,
          })),
          matchScore: score,
          entrySource: "ai" as const,
        };
      });

      if (dbResult.total > 0 && aiBoost) {
        const dbList = dbResult.list.map((item) => ({ ...item, entrySource: "db" as const }));
        const seen = new Set(dbList.map((d) => d.dishId));
        const aiExtra = generated.filter((a) => !seen.has(a.dishId));
        const merged = [...dbList, ...aiExtra];
        return {
          list: merged,
          total: merged.length,
          page: 1,
          pageSize: merged.length,
          source: "mixed" as const,
          aiMeta: {
            used: true,
            triggeredBy: "manual_ai_boost",
            generationSaved: aiFallback.generationSaved,
          },
          actions: [{ actionType: "ai_boost_recommend", text: "AI 帮我再推荐" }],
        };
      }

      return {
        list: generated,
        total: generated.length,
        page: 1,
        pageSize: generated.length,
        source: "ai_generated",
        aiMeta: {
          used: true,
          triggeredBy: "db_miss",
          generationSaved: aiFallback.generationSaved,
        },
        actions: [{ actionType: "ai_boost_recommend", text: "AI 帮我再推荐" }],
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      if (error instanceof AiGenerationError) {
        throw new ServiceUnavailableException(error.message);
      }
      this.logger.error(
        `Recommend AI path failed. ingredients=${JSON.stringify(Array.from(normalized))}, aiBoost=${aiBoost}`,
        error instanceof Error ? error.stack : JSON.stringify(error),
      );
      throw new ServiceUnavailableException("AI 推荐暂时不可用，请稍后重试。");
    }
  }

  private computeMatches(
    dishes: Array<{
      dishId: string;
      dishName: string;
      ingredientsForMatch: string[];
      missingIngredients: Array<{ name: string; role: "main" | "secondary" }>;
      cookTimeMinutes: number;
      difficulty: number;
      videos: Array<{
        videoId: string;
        title: string;
        url: string;
        durationSec: number;
        likeCount: number;
      }>;
    }>,
    normalized: Set<string>,
    page: number,
    pageSize: number,
    aiBoost: boolean,
  ) {
    const matched = dishes
      .filter((dish) => dish.ingredientsForMatch.length > 0)
      .map((dish) => {
        const hit = dish.ingredientsForMatch.filter((item) => this.ingredientSatisfiedByPantry(normalized, item)).length;
        const matchScore = Number((hit / dish.ingredientsForMatch.length).toFixed(2));
        return { ...dish, matchScore };
      })
      .filter((dish) => dish.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore)
      .map(({ ingredientsForMatch, ...rest }) => rest);

    const safePage = Math.max(1, page);
    const safePageSize = Math.max(1, pageSize);
    const start = (safePage - 1) * safePageSize;
    const list = matched.slice(start, start + safePageSize);
    return {
      list,
      total: matched.length,
      page: safePage,
      pageSize: safePageSize,
      source: "db",
      aiMeta: {
        used: false,
        triggeredBy: aiBoost ? "manual_ai_boost_pending" : "none",
        generationSaved: false,
      },
      actions: [{ actionType: "ai_boost_recommend", text: "AI 帮我再推荐" }],
    };
  }
}
