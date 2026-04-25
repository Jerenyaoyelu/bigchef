import { Body, Controller, Delete, Get, Headers, Param, Post, Query } from "@nestjs/common";
import { ProfileService } from "./profile.service";

type DishPayload = {
  dishId: string;
};

@Controller("api/v1/user")
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  private userIdFrom(headerUserId?: string, queryUserId?: string) {
    return this.profileService.resolveUserId(headerUserId || queryUserId);
  }

  @Get("favorites")
  favorites(@Headers("x-user-id") headerUserId?: string, @Query("userId") queryUserId?: string) {
    return this.profileService.getFavorites(this.userIdFrom(headerUserId, queryUserId));
  }

  @Post("favorites")
  addFavorite(
    @Body() payload: DishPayload,
    @Headers("x-user-id") headerUserId?: string,
    @Query("userId") queryUserId?: string,
  ) {
    return this.profileService.addFavorite(payload.dishId, this.userIdFrom(headerUserId, queryUserId));
  }

  @Delete("favorites/:dishId")
  removeFavorite(
    @Param("dishId") dishId: string,
    @Headers("x-user-id") headerUserId?: string,
    @Query("userId") queryUserId?: string,
  ) {
    return this.profileService.removeFavorite(dishId, this.userIdFrom(headerUserId, queryUserId));
  }

  @Get("history")
  history(@Headers("x-user-id") headerUserId?: string, @Query("userId") queryUserId?: string, @Query("limit") limit?: string) {
    const parsed = limit ? Math.max(1, Number(limit) || 20) : 20;
    return this.profileService.getHistory(this.userIdFrom(headerUserId, queryUserId), parsed);
  }

  @Post("history")
  addHistory(
    @Body() payload: DishPayload,
    @Headers("x-user-id") headerUserId?: string,
    @Query("userId") queryUserId?: string,
  ) {
    return this.profileService.addHistory(payload.dishId, this.userIdFrom(headerUserId, queryUserId));
  }

  @Delete("history")
  clearHistory(@Headers("x-user-id") headerUserId?: string, @Query("userId") queryUserId?: string) {
    return this.profileService.clearHistory(this.userIdFrom(headerUserId, queryUserId));
  }
}
