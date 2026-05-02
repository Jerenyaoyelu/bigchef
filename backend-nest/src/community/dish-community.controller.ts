import { Controller, Get, Param } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";

@Controller("api/v2/dishes")
export class DishCommunityController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(":dishId/videos")
  async listCommunityVideos(@Param("dishId") dishId: string) {
    const posts = await this.prisma.communityPost.findMany({
      where: {
        dishId,
        status: "published",
        videoStatus: "ready",
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return {
      dishId,
      videoSourceType: posts.length ? "internal" : "none",
      items: posts.map((p) => ({
        postId: p.id,
        videoUrl: p.videoUrl,
        coverUrl: p.coverUrl,
        durationSec: p.durationSec,
        authorId: p.authorId,
        title: p.title,
        createdAt: p.createdAt,
      })),
    };
  }
}
