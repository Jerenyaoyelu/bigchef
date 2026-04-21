import { Body, Controller, Post } from "@nestjs/common";
import { RecommendByIngredientsDto } from "./dto/recommend-by-ingredients.dto";
import { RecommendService } from "./recommend.service";

@Controller("api/v1/recommend")
export class RecommendController {
  constructor(private readonly recommendService: RecommendService) {}

  @Post("by-ingredients")
  byIngredients(@Body() payload: RecommendByIngredientsDto) {
    return this.recommendService.byIngredients(payload.ingredients);
  }
}
