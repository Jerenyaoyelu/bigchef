import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsBoolean, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class RecommendByIngredientsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  ingredients!: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize = 10;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  aiBoost = false;
}
