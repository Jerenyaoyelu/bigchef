import { IsString, MinLength } from "class-validator";

export class GuestUpgradeDto {
  @IsString()
  @MinLength(6)
  guestId!: string;
}
