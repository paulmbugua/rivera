import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import {
  ValidationPipe,
  BadRequestException,
  HttpStatus,
} from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { AppModule } from "./module";
import { ApiException } from "./common/api-error";
import express from "express";
import { resolve } from "node:path";
import { AnalyticsInterceptor } from "./operations/operations.service";
import {
  correlationId,
  ErrorMonitor,
  GlobalExceptionFilter,
  RequestLoggingInterceptor,
} from "./common/observability";
async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.enableShutdownHooks();
  app.setGlobalPrefix("api/v1");
  const origins = (process.env.WEB_ORIGINS ?? process.env.WEB_ORIGIN ?? "http://localhost:3000")
    .split(",").map(value => value.trim()).filter(Boolean);
  const origin = origins[0];
  app.enableCors({ origin: origins, credentials: true });
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(correlationId);
  app.use(cookieParser());
  app.use(
    "/media",
    express.static(resolve(process.env.LOCAL_UPLOAD_DIR ?? "./uploads"), {
      dotfiles: "deny",
      fallthrough: false,
      index: false,
      maxAge: "1d",
    }),
  );
  app.use(
    (
      req: {
        method: string;
        headers: { origin?: string; referer?: string };
        cookies?: Record<string, string>;
      },
      _res: unknown,
      next: (error?: Error) => void,
    ) => {
      if (
        ["POST", "PUT", "PATCH", "DELETE"].includes(req.method) &&
        req.headers.origin &&
        !origins.includes(req.headers.origin)
      )
        return next(new BadRequestException("Request origin is not allowed"));
      if (
        ["POST", "PUT", "PATCH", "DELETE"].includes(req.method) &&
        !req.headers.origin &&
        req.headers.referer &&
        !origins.some(allowed => req.headers.referer!.startsWith(allowed + "/"))
      )
        return next(new BadRequestException("Request origin is not allowed"));
      if (
        ["POST", "PUT", "PATCH", "DELETE"].includes(req.method) &&
        !req.headers.origin &&
        (req.cookies?.rivera_access || req.cookies?.rivera_refresh)
      )
        return next(new BadRequestException("Request origin is required"));
      next();
    },
  );
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) =>
        new ApiException(
          HttpStatus.BAD_REQUEST,
          "VALIDATION_ERROR",
          errors
            .flatMap((error) => Object.values(error.constraints ?? {}))
            .join(". "),
        ),
    }),
  );
  app.useGlobalInterceptors(
    app.get(RequestLoggingInterceptor),
    app.get(AnalyticsInterceptor),
  );
  app.useGlobalFilters(new GlobalExceptionFilter(app.get(ErrorMonitor)));
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle("Rivera API")
      .setDescription(
        "Rivera authentication, profiles, campaigns, Creator proposals, application credits and Stripe-verified Application Fees. Public campaign responses exclude locked briefs and private contacts. Payment webhooks use provider signatures; errors use { statusCode, code, message }.",
      )
      .setVersion("0.9")
      .addCookieAuth(
        "rivera_access",
        { type: "apiKey", in: "cookie" },
        "access-cookie",
      )
      .build(),
  );
  if (process.env.NODE_ENV !== "production")
    SwaggerModule.setup("api/docs", app, document);
  await app.listen(Number(process.env.PORT ?? 4000), "0.0.0.0");
}
bootstrap();
