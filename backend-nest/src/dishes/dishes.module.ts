import { Module } from "@nestjs/common";
import { ProfileModule } from "../profile/profile.module";
import { DishesController } from "./dishes.controller";
import { DishesService } from "./dishes.service";

@Module({
  imports: [ProfileModule],
  controllers: [DishesController],
  providers: [DishesService],
})
export class DishesModule {}
