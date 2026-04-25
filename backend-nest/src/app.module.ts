import { Module } from "@nestjs/common";
import { AiModule } from "./ai/ai.module";
import { DatabaseModule } from "./database/database.module";
import { DishesModule } from "./dishes/dishes.module";
import { HealthController } from "./health.controller";
import { ProfileModule } from "./profile/profile.module";
import { RecommendModule } from "./recommend/recommend.module";

@Module({
  imports: [AiModule, DatabaseModule, RecommendModule, DishesModule, ProfileModule],
  controllers: [HealthController],
})
export class AppModule {}
