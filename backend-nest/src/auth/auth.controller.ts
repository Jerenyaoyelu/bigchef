import { Body, Controller, Get, Headers, Post, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { GuestUpgradeDto } from "./dto/guest-upgrade.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { SendSmsDto } from "./dto/send-sms.dto";
import { SmsLoginDto } from "./dto/sms-login.dto";

@Controller("api/v1/auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("sms/send")
  sendSms(@Body() payload: SendSmsDto) {
    return this.authService.sendSms(payload.phone);
  }

  @Post("sms/login")
  smsLogin(@Body() payload: SmsLoginDto) {
    return this.authService.smsLogin(payload.phone, payload.code);
  }

  @Post("refresh")
  refresh(@Body() payload: RefreshTokenDto) {
    return this.authService.refresh(payload.refreshToken);
  }

  @Get("me")
  me(@Headers("authorization") authorization?: string) {
    return this.authService.me(this.extractBearerToken(authorization));
  }

  @Post("guest/upgrade")
  async guestUpgrade(@Body() payload: GuestUpgradeDto, @Headers("authorization") authorization?: string) {
    const userId = await this.authService.resolveUserIdFromAccessToken(this.extractBearerToken(authorization));
    return this.authService.upgradeGuestData(payload.guestId, userId);
  }

  private extractBearerToken(authorization?: string) {
    if (!authorization?.startsWith("Bearer ")) {
      throw new UnauthorizedException("缺少有效的 Bearer token");
    }
    return authorization.slice("Bearer ".length).trim();
  }
}
