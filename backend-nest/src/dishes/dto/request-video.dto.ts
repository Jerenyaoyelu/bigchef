import { IsOptional, IsString } from "class-validator";

export class RequestVideoDto {
  @IsOptional()
  @IsString()
  sourcePage?: string;

  @IsOptional()
  @IsString()
  guestId?: string;

  @IsOptional()
  @IsString()
  deviceId?: string;
}
