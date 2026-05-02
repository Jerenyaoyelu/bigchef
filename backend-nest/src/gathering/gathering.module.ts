import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { BearerAuthGuard } from "../auth/bearer-auth.guard";
import { DatabaseModule } from "../database/database.module";
import { GatheringController } from "./gathering.controller";
import { GatheringService } from "./gathering.service";

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [GatheringController],
  providers: [GatheringService, BearerAuthGuard],
})
export class GatheringModule {}
