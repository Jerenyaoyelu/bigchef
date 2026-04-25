import { Inject, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { LlmProvider } from "../ai/llm.provider";
import { PrismaService } from "../database/prisma.service";

@Injectable()
export class DishesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject("LLM_PROVIDER") private readonly llmProvider: LlmProvider,
  ) {}

  async search(dishName: string) {
    try {
      const dish = await this.prisma.dish.findFirst({
        where: { name: { contains: dishName } },
        include: {
          ingredients: { include: { ingredient: true } },
          videos: true,
        },
      });

      if (dish) return this.toDishResponse(dish);
    } catch {
      throw new ServiceUnavailableException("数据库服务暂时不可用，请稍后重试。");
    }

    throw new NotFoundException("未收录该菜谱，请尝试更具体菜名。");
  }

  async findById(dishId: string) {
    try {
      const dish = await this.prisma.dish.findUnique({
        where: { id: dishId },
        include: { ingredients: { include: { ingredient: true } }, videos: true },
      });
      if (!dish) throw new NotFoundException("未收录该菜谱。");
      return this.toDishResponse(dish);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new ServiceUnavailableException("数据库服务暂时不可用，请稍后重试。");
    }
  }

  async popular(limit: number) {
    try {
      const rows = await this.prisma.dish.findMany({
        include: { videos: true },
        orderBy: [{ videos: { _count: "desc" } }, { name: "asc" }],
        take: limit,
      });
      return {
        list: rows.map((dish) => ({
          dishId: dish.id,
          dishName: dish.name,
          cookTimeMinutes: dish.cookTimeMinutes ?? 20,
          difficulty: dish.difficulty ?? 2,
        })),
        total: rows.length,
      };
    } catch {
      throw new ServiceUnavailableException("热门菜服务暂时不可用，请稍后重试。");
    }
  }

  private async toDishResponse(dish: {
    id: string;
    name: string;
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
  }) {
    const grouped = { main: [] as string[], secondary: [] as string[], seasoning: [] as string[] };
    for (const item of dish.ingredients) {
      const content = item.amountText ? `${item.ingredient.name} ${item.amountText}` : item.ingredient.name;
      if (item.role === "main") grouped.main.push(content);
      if (item.role === "secondary") grouped.secondary.push(content);
      if (item.role === "seasoning") grouped.seasoning.push(content);
    }

    const summary = await this.llmProvider.summarizeSteps({
      dishName: dish.name,
      rawSteps: this.normalizeSteps(dish.stepsSummary),
    });

    return {
      dishId: dish.id,
      dishName: dish.name,
      cookTimeMinutes: dish.cookTimeMinutes ?? 20,
      difficulty: dish.difficulty ?? 2,
      ingredients: grouped,
      stepsSummary: summary.steps,
      summarySource: summary.source,
      videos: dish.videos.map((video) => ({
        videoId: video.id,
        title: video.title,
        url: video.url,
        durationSec: video.durationSec ?? 0,
        likeCount: video.likeCount ?? 0,
      })),
    };
  }

  private normalizeSteps(steps: unknown): string[] {
    if (!Array.isArray(steps)) return [];
    return steps.filter((step) => typeof step === "string").map((step) => step.trim()).filter(Boolean);
  }
}
