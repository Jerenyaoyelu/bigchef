import { Body, Controller, Headers, Post } from "@nestjs/common";
import { Get, Param, Query } from "@nestjs/common";
import { ProfileService } from "../profile/profile.service";
import { RequestVideoDto } from "./dto/request-video.dto";
import { SearchDishDto } from "./dto/search-dish.dto";
import { DishesService } from "./dishes.service";

@Controller("api/v1/dishes")
export class DishesController {
  constructor(
    private readonly dishesService: DishesService,
    private readonly profileService: ProfileService,
  ) {}

  private userIdFrom(params: {
    headerUserId?: string;
    queryUserId?: string;
    headerGuestId?: string;
    queryGuestId?: string;
  }) {
    return this.profileService.resolveUserId(
      params.headerUserId || params.queryUserId || params.headerGuestId || params.queryGuestId,
    );
  }

  @Post("search")
  search(@Body() payload: SearchDishDto) {
    return this.dishesService.search(payload.dishName);
  }

  @Get("popular")
  popular(@Query("limit") limit?: string) {
    const parsed = limit ? Math.max(1, Number(limit) || 8) : 8;
    return this.dishesService.popular(parsed);
  }

  @Get(":dishId")
  detail(@Param("dishId") dishId: string) {
    return this.dishesService.findById(dishId);
  }

  @Post(":dishId/like")
  toggleLike(
    @Param("dishId") dishId: string,
    @Headers("x-user-id") headerUserId?: string,
    @Query("userId") queryUserId?: string,
    @Headers("x-guest-id") headerGuestId?: string,
    @Query("guestId") queryGuestId?: string,
  ) {
    return this.dishesService.toggleDishLike(
      dishId,
      this.userIdFrom({ headerUserId, queryUserId, headerGuestId, queryGuestId }),
    );
  }

  @Post(":dishId/request-video")
  requestVideo(@Param("dishId") dishId: string, @Body() payload: RequestVideoDto) {
    return this.dishesService.requestVideoUpdate(dishId, payload);
  }
}
