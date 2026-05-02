import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { BearerAuthGuard } from "../auth/bearer-auth.guard";
import { DatabaseModule } from "../database/database.module";
import { FamilyController } from "./family.controller";
import { FamilyService } from "./family.service";

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [FamilyController],
  providers: [FamilyService, BearerAuthGuard],
})
export class FamilyModule {}
