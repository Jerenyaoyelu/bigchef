import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import type { NextFunction, Request, Response } from "express";
import { join } from "path";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ["error", "warn", "log"],
  });
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useStaticAssets(join(process.cwd(), "uploads"), { prefix: "/media/" });

  const httpLog = new Logger("HTTP");
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on("finish", () => {
      const ms = Date.now() - start;
      httpLog.log(`${req.method} ${req.originalUrl} → ${res.statusCode} ${ms}ms`);
    });
    next();
  });

  const port = Number(process.env.PORT || 8000);
  await app.listen(port);
  httpLog.log(`Listening on port ${port}`);
}

bootstrap();
