import { IsArray, IsIn, IsOptional, IsString } from "class-validator";

export class PatchCommunityPostDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  dishId?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsIn(["draft", "published"])
  status?: "draft" | "published";
}
