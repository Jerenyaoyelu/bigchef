import { BadRequestException, Inject, Injectable, Logger, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { AiGenerationError } from "../ai/ai-generation.error";
import { LlmProvider } from "../ai/llm.provider";
import { RecipeGenerationService } from "../ai/recipe-generation.service";
import { PrismaService } from "../database/prisma.service";
import { RequestVideoDto } from "./dto/request-video.dto";

const VIDEO_REQUEST_COOLDOWN_DAYS = Number(process.env.VIDEO_REQUEST_COOLDOWN_DAYS ?? 7);

/** 库内已有不少于该条数的非空步骤时，视为可直接下发，不再调大模型 */
const MIN_STORED_STEPS_TO_SKIP_LLM = 3;

@Injectable()
export class DishesService {
  private readonly logger = new Logger(DishesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly recipeGenerationService: RecipeGenerationService,
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

      if (dish) return this.toDishResponse(dish, { used: false, triggeredBy: "none", generationSaved: false }, "db");
    } catch {
      throw new ServiceUnavailableException("数据库服务暂时不可用，请稍后重试。");
    }

    let ai;
    try {
      ai = await this.recipeGenerationService.generateSearchWithPersistence({ dishName });
    } catch (error) {
      if (error instanceof AiGenerationError) {
        throw new ServiceUnavailableException(error.message);
      }
      throw error;
    }
    if (!ai.dish) {
      throw new NotFoundException("未收录该菜谱，请尝试更具体菜名。");
    }
    return this.toDishResponse(ai.dish, { used: true, triggeredBy: "db_miss", generationSaved: ai.generationSaved }, "ai_generated");
  }

  async findById(dishId: string) {
    try {
      const dish = await this.prisma.dish.findUnique({
        where: { id: dishId },
        include: { ingredients: { include: { ingredient: true } }, videos: true },
      });
      if (!dish) throw new NotFoundException("未收录该菜谱。");
      return this.toDishResponse(dish, { used: false, triggeredBy: "none", generationSaved: false }, "db");
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new ServiceUnavailableException("数据库服务暂时不可用，请稍后重试。");
    }
  }

  async requestVideoUpdate(dishId: string, payload: RequestVideoDto) {
    const db = this.prisma as any;
    const dish = await this.prisma.dish.findUnique({ where: { id: dishId }, select: { id: true } });
    if (!dish) {
      throw new NotFoundException("菜谱不存在。");
    }
    const requesterKey = payload.deviceId?.trim() || payload.guestId?.trim();
    if (!requesterKey) {
      throw new BadRequestException("缺少设备标识或 guestId，无法记录去重请求。");
    }

    try {
      const now = new Date();
      const cooldownMs = VIDEO_REQUEST_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
      const record = await db.videoRequestRecord.findUnique({
        where: { dishId_requesterKey: { dishId, requesterKey } },
      });
      const inCooldown = !!record && now.getTime() - record.lastRequestedAt.getTime() < cooldownMs;
      let counted = false;
      await this.prisma.$transaction(async (tx) => {
        const trx = tx as any;
        if (!record) {
          await trx.videoRequestRecord.create({
            data: {
              dishId,
              requesterKey,
              requestCount: 1,
              firstRequestedAt: now,
              lastRequestedAt: now,
            },
          });
          await trx.videoRequestDemand.upsert({
            where: { dishId },
            update: {
              totalRequests: { increment: 1 },
              uniqueRequestUsers: { increment: 1 },
            },
            create: { dishId, totalRequests: 1, uniqueRequestUsers: 1 },
          });
          counted = true;
          return;
        }

        await trx.videoRequestRecord.update({
          where: { id: record.id },
          data: {
            requestCount: { increment: 1 },
            lastRequestedAt: now,
          },
        });
        if (!inCooldown) {
          await trx.videoRequestDemand.upsert({
            where: { dishId },
            update: { totalRequests: { increment: 1 } },
            create: { dishId, totalRequests: 1, uniqueRequestUsers: 0 },
          });
          counted = true;
        }
      });

      const demand = await db.videoRequestDemand.findUnique({ where: { dishId } });
      return {
        success: true,
        counted,
        cooldownDays: VIDEO_REQUEST_COOLDOWN_DAYS,
        sourcePage: payload.sourcePage ?? "unknown",
        metrics: {
          totalRequests: demand?.totalRequests ?? 0,
          uniqueRequestUsers: demand?.uniqueRequestUsers ?? 0,
        },
      };
    } catch {
      throw new ServiceUnavailableException("求更新视频服务暂时不可用，请稍后重试。");
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

  private async toDishResponse(
    dish: {
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
    },
    aiMeta: { used: boolean; triggeredBy: string; generationSaved: boolean },
    source: string,
  ) {
    const grouped = { main: [] as string[], secondary: [] as string[], seasoning: [] as string[] };
    for (const item of dish.ingredients) {
      const content = item.amountText ? `${item.ingredient.name} ${item.amountText}` : item.ingredient.name;
      if (item.role === "main") grouped.main.push(content);
      if (item.role === "secondary") grouped.secondary.push(content);
      if (item.role === "seasoning") grouped.seasoning.push(content);
    }

    const { steps, summarySource } = await this.resolveStepsSummary(dish.id, dish.name, dish.stepsSummary);

    return {
      dishId: dish.id,
      dishName: dish.name,
      cookTimeMinutes: dish.cookTimeMinutes ?? 20,
      difficulty: dish.difficulty ?? 2,
      ingredients: grouped,
      stepsSummary: steps,
      summarySource,
      source,
      aiMeta,
      videoSourceType: dish.videos.length > 0 ? "internal" : "none",
      emptyStateActions:
        dish.videos.length > 0
          ? []
          : [
              { actionType: "view_steps", text: "先看图文步骤" },
              { actionType: "request_video", text: "求更新该菜谱视频" },
            ],
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

  /**
   * 步骤充足则直接返回库内数据；不足则调用大模型（失败时 provider 内会走规则兜底），
   * 将生成结果写回 stepsSummary，后续请求命中库内数据即可跳过 LLM。
   */
  private async resolveStepsSummary(
    dishId: string,
    dishName: string,
    stepsUnknown: unknown,
  ): Promise<{ steps: string[]; summarySource: "db" | "doubao" | "local_rules" }> {
    const raw = this.normalizeSteps(stepsUnknown);
    if (raw.length >= MIN_STORED_STEPS_TO_SKIP_LLM) {
      return { steps: raw, summarySource: "db" };
    }

    const rawForLlm =
      raw.length > 0 ? raw : [`${dishName}：可参考所需食材与视频，按家常做法分步烹饪。`];

    const summary = await this.llmProvider.summarizeSteps({
      dishName,
      rawSteps: rawForLlm,
    });

    try {
      await this.prisma.dish.update({
        where: { id: dishId },
        data: { stepsSummary: summary.steps },
      });
    } catch (error) {
      this.logger.warn(
        `写入步骤摘要失败 dishId=${dishId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return { steps: summary.steps, summarySource: summary.source };
  }
}
