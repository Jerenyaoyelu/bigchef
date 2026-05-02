import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export type RequestUser = { userId: string };

export const ReqUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): RequestUser | undefined => {
  const req = ctx.switchToHttp().getRequest();
  return req.user as RequestUser | undefined;
});
