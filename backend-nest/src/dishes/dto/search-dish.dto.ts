import { IsString, MinLength } from "class-validator";

export class SearchDishDto {
  @IsString()
  @MinLength(1)
  dishName!: string;
}
