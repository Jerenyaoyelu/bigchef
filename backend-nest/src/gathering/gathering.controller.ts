import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { BearerAuthGuard } from "../auth/bearer-auth.guard";
import { ReqUser, RequestUser } from "../auth/optional-user";
import { GatheringService } from "./gathering.service";

class CreateGatheringDto {
  @IsInt()
  @Min(1)
  @Max(50)
  headcount!: number;

  @IsOptional()
  @IsString()
  title?: string;
}

class JoinGatheringDto {
  @IsString()
  shareToken!: string;
}

class AddGatheringWishDto {
  @IsOptional()
  @IsString()
  dishId?: string;

  @IsOptional()
  @IsString()
  freeText?: string;
}

class PatchGatheringDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  beveragePresets?: string[];

  @IsOptional()
  @IsString()
  beverageNote?: string;

  @IsOptional()
  @IsBoolean()
  includeBeverageInShopping?: boolean;

  @IsOptional()
  menuItems?: unknown;

  @IsOptional()
  shoppingList?: unknown;

  @IsOptional()
  @IsString()
  status?: string;
}

@Controller("api/v2/gatherings")
@UseGuards(BearerAuthGuard)
export class GatheringController {
  constructor(private readonly gathering: GatheringService) {}

  @Post()
  create(@ReqUser() user: RequestUser, @Body() body: CreateGatheringDto) {
    return this.gathering.create(user.userId, body);
  }

  @Post("join")
  join(@ReqUser() user: RequestUser, @Body() body: JoinGatheringDto) {
    return this.gathering.join(user.userId, body.shareToken);
  }

  @Get(":id")
  get(@Param("id") id: string, @ReqUser() user: RequestUser) {
    return this.gathering.get(id, user.userId);
  }

  @Post(":id/wishes")
  addWish(@Param("id") id: string, @ReqUser() user: RequestUser, @Body() body: AddGatheringWishDto) {
    return this.gathering.addWish(id, user.userId, body);
  }

  @Post(":id/generate-menu")
  generate(@Param("id") id: string, @ReqUser() user: RequestUser) {
    return this.gathering.generateMenu(id, user.userId);
  }

  @Post(":id/shopping-list/generate")
  genShopping(@Param("id") id: string, @ReqUser() user: RequestUser) {
    return this.gathering.generateShoppingList(id, user.userId);
  }

  @Patch(":id")
  patch(@Param("id") id: string, @ReqUser() user: RequestUser, @Body() body: PatchGatheringDto) {
    return this.gathering.patchGathering(id, user.userId, body);
  }

  @Post(":id/close")
  close(@Param("id") id: string, @ReqUser() user: RequestUser) {
    return this.gathering.close(id, user.userId);
  }
}
