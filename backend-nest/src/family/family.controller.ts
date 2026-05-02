import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { IsBoolean, IsIn, IsOptional, IsString } from "class-validator";
import { BearerAuthGuard } from "../auth/bearer-auth.guard";
import { ReqUser, RequestUser } from "../auth/optional-user";
import { FamilyService } from "./family.service";

class CreateFamilyDto {
  @IsString()
  name!: string;

  @IsIn(["couple", "roommates"])
  householdRelation!: "couple" | "roommates";
}

class JoinFamilyDto {
  @IsString()
  inviteCode!: string;
}

class PatchFamilyDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsIn(["couple", "roommates"])
  householdRelation?: "couple" | "roommates";

  @IsOptional()
  @IsIn(["couple_flexible", "household_explicit"])
  collaborationMode?: "couple_flexible" | "household_explicit";

  @IsOptional()
  hostOnlyEdit?: boolean;
}

class CreateMealPlanDto {
  @IsString()
  menuWeekId!: string;

  @IsString()
  dishId!: string;

  @IsString()
  date!: string;

  @IsOptional()
  @IsString()
  assigneeUserId?: string;
}

class PatchMealPlanDto {
  @IsOptional()
  @IsIn(["planned", "done"])
  status?: "planned" | "done";

  @IsOptional()
  @IsString()
  assigneeUserId?: string | null;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsString()
  dishId?: string;
}

class AddWishDto {
  @IsString()
  dishId!: string;

  @IsOptional()
  @IsString()
  note?: string;
}

class PatchShoppingListDto {
  @IsOptional()
  items?: Array<{ id: string; purchased?: boolean; excludedReason?: string | null }>;
}

class GenerateWeekMenuDto {
  @IsOptional()
  @IsBoolean()
  useAiFill?: boolean;
}

class CreateCheckinDto {
  @IsOptional()
  @IsString()
  dishId?: string;

  @IsOptional()
  @IsString()
  menuWeekId?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  mediaUrl?: string;
}

@Controller("api/v2/families")
@UseGuards(BearerAuthGuard)
export class FamilyController {
  constructor(private readonly family: FamilyService) {}

  @Post()
  create(@ReqUser() user: RequestUser, @Body() body: CreateFamilyDto) {
    return this.family.createFamily(user.userId, body);
  }

  @Post("join")
  join(@ReqUser() user: RequestUser, @Body() body: JoinFamilyDto) {
    return this.family.joinFamily(user.userId, body.inviteCode);
  }

  @Get(":id")
  get(@Param("id") id: string, @ReqUser() user: RequestUser) {
    return this.family.getFamily(id, user.userId);
  }

  @Patch(":id")
  patch(@Param("id") id: string, @ReqUser() user: RequestUser, @Body() body: PatchFamilyDto) {
    return this.family.patchFamily(id, user.userId, body);
  }

  @Get(":id/menu-weeks")
  listWeeks(@Param("id") id: string, @ReqUser() user: RequestUser) {
    return this.family.listMenuWeeks(id, user.userId);
  }

  @Post(":id/menu-weeks")
  upsertWeek(@Param("id") id: string, @ReqUser() user: RequestUser, @Body() body: { weekStart?: string }) {
    return this.family.upsertMenuWeek(id, user.userId, body.weekStart);
  }

  @Get(":id/menu-weeks/:weekId")
  getWeek(@Param("id") id: string, @Param("weekId") weekId: string, @ReqUser() user: RequestUser) {
    return this.family.getMenuWeek(id, weekId, user.userId);
  }

  @Patch(":id/menu-weeks/:weekId")
  patchWeek(
    @Param("id") id: string,
    @Param("weekId") weekId: string,
    @ReqUser() user: RequestUser,
    @Body() body: { status?: string },
  ) {
    return this.family.patchMenuWeek(id, weekId, user.userId, body);
  }

  @Post(":id/menu-weeks/:weekId/generate-menu")
  generateMenu(
    @Param("id") id: string,
    @Param("weekId") weekId: string,
    @ReqUser() user: RequestUser,
    @Body() body: GenerateWeekMenuDto,
  ) {
    return this.family.generateWeekMenuFromWishes(id, weekId, user.userId, { useAiFill: body.useAiFill === true });
  }

  @Post(":id/menu-weeks/:weekId/notify")
  notifyWeek(@Param("weekId") weekId: string) {
    return { ok: true, weekId, channel: "stub" };
  }

  @Post(":id/plans")
  addPlan(@Param("id") id: string, @ReqUser() user: RequestUser, @Body() body: CreateMealPlanDto) {
    return this.family.addMealPlan(id, user.userId, body);
  }

  @Patch(":id/plans/:planId")
  patchPlan(
    @Param("id") id: string,
    @Param("planId") planId: string,
    @ReqUser() user: RequestUser,
    @Body() body: PatchMealPlanDto,
  ) {
    return this.family.patchMealPlan(id, planId, user.userId, body);
  }

  @Get(":id/wishes")
  listWishes(@Param("id") id: string, @ReqUser() user: RequestUser) {
    return this.family.listWishes(id, user.userId);
  }

  @Post(":id/wishes")
  addWish(@Param("id") id: string, @ReqUser() user: RequestUser, @Body() body: AddWishDto) {
    return this.family.addWish(id, user.userId, body);
  }

  @Delete(":id/wishes/:wishId")
  deleteWish(@Param("id") id: string, @Param("wishId") wishId: string, @ReqUser() user: RequestUser) {
    return this.family.deleteWish(id, wishId, user.userId);
  }

  @Get(":id/stats/dishes")
  stats(@Param("id") id: string, @ReqUser() user: RequestUser, @Query("windowDays") windowDays?: string) {
    const parsed = windowDays ? Number(windowDays) : 30;
    return this.family.statsDishes(id, user.userId, Number.isFinite(parsed) ? parsed : 30);
  }

  @Post(":id/menu-weeks/:weekId/shopping-list/generate")
  genShopping(
    @Param("id") id: string,
    @Param("weekId") weekId: string,
    @ReqUser() user: RequestUser,
    @Body() body: { mode?: "single" | "two_phase" },
  ) {
    return this.family.generateShoppingList(id, weekId, user.userId, body.mode ?? "single");
  }

  @Get(":id/shopping-lists/:listId")
  getShopping(@Param("id") id: string, @Param("listId") listId: string, @ReqUser() user: RequestUser) {
    return this.family.getShoppingList(id, listId, user.userId);
  }

  @Patch(":id/shopping-lists/:listId")
  patchShopping(
    @Param("id") id: string,
    @Param("listId") listId: string,
    @ReqUser() user: RequestUser,
    @Body() body: PatchShoppingListDto,
  ) {
    return this.family.patchShoppingList(id, listId, user.userId, body);
  }

  @Post(":id/checkins")
  addCheckin(@Param("id") id: string, @ReqUser() user: RequestUser, @Body() body: CreateCheckinDto) {
    return this.family.addCheckin(id, user.userId, body);
  }

  @Get(":id/checkins")
  listCheckins(@Param("id") id: string, @ReqUser() user: RequestUser, @Query("limit") limit?: string) {
    const parsed = limit ? Number(limit) : 30;
    return this.family.listCheckins(id, user.userId, Number.isFinite(parsed) ? parsed : 30);
  }
}
