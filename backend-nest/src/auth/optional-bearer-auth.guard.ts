import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { AuthService } from "./auth.service";

/** 若带 Bearer 则校验并写入 req.user；无 token 或非法 token 时静默通过（不写入 user）。 */
@Injectable()
export class OptionalBearerAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const authorization = req.headers?.authorization as string | undefined;
    if (!authorization?.startsWith("Bearer ")) {
      return true;
    }
    const token = authorization.slice("Bearer ".length).trim();
    try {
      const userId = await this.authService.resolveUserIdFromAccessToken(token);
      req.user = { userId };
    } catch {
      // 可选鉴权：无效 token 视为匿名
    }
    return true;
  }
}
