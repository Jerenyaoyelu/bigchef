import { IsString, MinLength } from "class-validator";

export class ReportPostDto {
  @IsString()
  @MinLength(1)
  reason!: string;
}
