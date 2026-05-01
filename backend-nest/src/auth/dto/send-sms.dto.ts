import { IsString, Matches } from "class-validator";

export class SendSmsDto {
  @IsString()
  @Matches(/^1\d{10}$/, { message: "手机号格式不正确" })
  phone!: string;
}
