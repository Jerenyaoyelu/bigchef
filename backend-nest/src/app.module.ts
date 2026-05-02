import { Module } from "@nestjs/common";
import { AiModule } from "./ai/ai.module";
import { AuthModule } from "./auth/auth.module";
import { CommunityModule } from "./community/community.module";
import { DatabaseModule } from "./database/database.module";
import { DishesModule } from "./dishes/dishes.module";
import { FamilyModule } from "./family/family.module";
import { GatheringModule } from "./gathering/gathering.module";
import { HealthController } from "./health.controller";
import { ProfileModule } from "./profile/profile.module";
import { RecommendModule } from "./recommend/recommend.module";

@Module({
  imports: [
    AiModule,
    AuthModule,
    DatabaseModule,
    RecommendModule,
    DishesModule,
    ProfileModule,
    CommunityModule,
    FamilyModule,
    GatheringModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
