import { Body, Controller, Delete, Get, Headers, Param, Post, Query } from "@nestjs/common";
import { ProfileService } from "./profile.service";

type DishPayload = {
  dishId: string;
};

@Controller("api/v1/user")
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

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

  @Get("dish-likes")
  dishLikes(
    @Headers("x-user-id") headerUserId?: string,
    @Query("userId") queryUserId?: string,
    @Headers("x-guest-id") headerGuestId?: string,
    @Query("guestId") queryGuestId?: string,
  ) {
    return this.profileService.getDishLikes(this.userIdFrom({ headerUserId, queryUserId, headerGuestId, queryGuestId }));
  }

  @Get("favorites")
  favorites(
    @Headers("x-user-id") headerUserId?: string,
    @Query("userId") queryUserId?: string,
    @Headers("x-guest-id") headerGuestId?: string,
    @Query("guestId") queryGuestId?: string,
  ) {
    return this.profileService.getFavorites(this.userIdFrom({ headerUserId, queryUserId, headerGuestId, queryGuestId }));
  }

  @Post("favorites")
  addFavorite(
    @Body() payload: DishPayload,
    @Headers("x-user-id") headerUserId?: string,
    @Query("userId") queryUserId?: string,
    @Headers("x-guest-id") headerGuestId?: string,
    @Query("guestId") queryGuestId?: string,
  ) {
    return this.profileService.addFavorite(
      payload.dishId,
      this.userIdFrom({ headerUserId, queryUserId, headerGuestId, queryGuestId }),
    );
  }

  @Delete("favorites/:dishId")
  removeFavorite(
    @Param("dishId") dishId: string,
    @Headers("x-user-id") headerUserId?: string,
    @Query("userId") queryUserId?: string,
    @Headers("x-guest-id") headerGuestId?: string,
    @Query("guestId") queryGuestId?: string,
  ) {
    return this.profileService.removeFavorite(
      dishId,
      this.userIdFrom({ headerUserId, queryUserId, headerGuestId, queryGuestId }),
    );
  }

  @Get("history")
  history(
    @Headers("x-user-id") headerUserId?: string,
    @Query("userId") queryUserId?: string,
    @Query("limit") limit?: string,
    @Headers("x-guest-id") headerGuestId?: string,
    @Query("guestId") queryGuestId?: string,
  ) {
    const parsed = limit ? Math.max(1, Number(limit) || 20) : 20;
    return this.profileService.getHistory(this.userIdFrom({ headerUserId, queryUserId, headerGuestId, queryGuestId }), parsed);
  }

  @Post("history")
  addHistory(
    @Body() payload: DishPayload,
    @Headers("x-user-id") headerUserId?: string,
    @Query("userId") queryUserId?: string,
    @Headers("x-guest-id") headerGuestId?: string,
    @Query("guestId") queryGuestId?: string,
  ) {
    return this.profileService.addHistory(
      payload.dishId,
      this.userIdFrom({ headerUserId, queryUserId, headerGuestId, queryGuestId }),
    );
  }

  @Delete("history")
  clearHistory(
    @Headers("x-user-id") headerUserId?: string,
    @Query("userId") queryUserId?: string,
    @Headers("x-guest-id") headerGuestId?: string,
    @Query("guestId") queryGuestId?: string,
  ) {
    return this.profileService.clearHistory(this.userIdFrom({ headerUserId, queryUserId, headerGuestId, queryGuestId }));
  }
}
