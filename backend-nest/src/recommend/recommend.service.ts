import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";

@Injectable()
export class RecommendService {
  constructor(private readonly prisma: PrismaService) {}

  async byIngredients(ingredients: string[]) {
    const normalized = new Set(
      ingredients.map((item) => item.trim()).filter(Boolean).map((item) => (item === "番茄" ? "西红柿" : item)),
    );

    try {
      const dishes = await this.prisma.dish.findMany({
        include: {
          ingredients: { include: { ingredient: true } },
          videos: true,
        },
        take: 20,
      });

      const fromDb = dishes.map((dish) => {
        const mainIngredients = dish.ingredients
          .filter((item) => item.role === "main")
          .map((item) => item.ingredient.name);
        return {
          dishId: dish.id,
          dishName: dish.name,
          requiredMain: mainIngredients,
          missingIngredients: [],
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

      return this.computeMatches(fromDb, normalized);
    } catch {
      throw new ServiceUnavailableException("数据库服务暂时不可用，请稍后重试。");
    }
  }

  private computeMatches(
    dishes: Array<{
      dishId: string;
      dishName: string;
      requiredMain: string[];
      missingIngredients: string[];
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
  ) {
    const list = dishes
      .filter((dish) => dish.requiredMain.length > 0)
      .map((dish) => {
        const hit = dish.requiredMain.filter((item) => normalized.has(item)).length;
        const matchScore = Number((hit / dish.requiredMain.length).toFixed(2));
        return { ...dish, matchScore };
      })
      .filter((dish) => dish.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore)
      .map(({ requiredMain, ...rest }) => rest);

    return { list, total: list.length };
  }
}
