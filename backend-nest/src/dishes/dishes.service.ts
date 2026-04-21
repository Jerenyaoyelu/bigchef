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

      if (dish) {
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
    } catch {
      throw new ServiceUnavailableException("数据库服务暂时不可用，请稍后重试。");
    }

    throw new NotFoundException("未收录该菜谱，请尝试更具体菜名。");
  }

  private normalizeSteps(steps: unknown): string[] {
    if (!Array.isArray(steps)) return [];
    return steps.filter((step) => typeof step === "string").map((step) => step.trim()).filter(Boolean);
  }
}
