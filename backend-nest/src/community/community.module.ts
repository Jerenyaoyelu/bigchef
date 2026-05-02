import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { BearerAuthGuard } from "../auth/bearer-auth.guard";
import { OptionalBearerAuthGuard } from "../auth/optional-bearer-auth.guard";
import { DatabaseModule } from "../database/database.module";
import { CommunityMediaController } from "./community-media.controller";
import { CommunityMediaService } from "./community-media.service";
import { CommunityPostsController } from "./community-posts.controller";
import { CommunityPostsService } from "./community-posts.service";
import { DishCommunityController } from "./dish-community.controller";

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [CommunityMediaController, CommunityPostsController, DishCommunityController],
  providers: [CommunityMediaService, CommunityPostsService, BearerAuthGuard, OptionalBearerAuthGuard],
})
export class CommunityModule {}
