import { IsOptional, IsString, Matches } from "class-validator";

export class SmsLoginDto {
  @IsString()
  @Matches(/^1\d{10}$/, { message: "手机号格式不正确" })
  phone!: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: "验证码应为6位数字" })
  code!: string;

  @IsOptional()
  @IsString()
  guestId?: string;
}
