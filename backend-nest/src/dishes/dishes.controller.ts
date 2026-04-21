import { Body, Controller, Post } from "@nestjs/common";
import { SearchDishDto } from "./dto/search-dish.dto";
import { DishesService } from "./dishes.service";

@Controller("api/v1/dishes")
export class DishesController {
  constructor(private readonly dishesService: DishesService) {}

  @Post("search")
  search(@Body() payload: SearchDishDto) {
    return this.dishesService.search(payload.dishName);
  }
}
