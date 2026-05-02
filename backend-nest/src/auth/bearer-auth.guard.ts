import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "./auth.service";

@Injectable()
export class BearerAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const authorization = req.headers?.authorization as string | undefined;
    if (!authorization?.startsWith("Bearer ")) {
      throw new UnauthorizedException("缺少有效的 Bearer token");
    }
    const token = authorization.slice("Bearer ".length).trim();
    const userId = await this.authService.resolveUserIdFromAccessToken(token);
    req.user = { userId };
    return true;
  }
}
