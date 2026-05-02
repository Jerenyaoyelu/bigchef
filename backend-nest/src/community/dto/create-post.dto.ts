import { IsArray, IsIn, IsOptional, IsString } from "class-validator";

export class CreateCommunityPostDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  dishId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  assetId?: string;

  @IsOptional()
  @IsString()
  externalVideoUrl?: string;

  @IsOptional()
  @IsString()
  coverUrl?: string;

  /** 草稿不在公共列表出现；发布后为 published */
  @IsOptional()
  @IsIn(["draft", "published"])
  status?: "draft" | "published";
}
