import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NestInterceptor,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { Request, Response } from "express";
import { Observable, catchError, tap, throwError } from "rxjs";

export type RiveraRequest = Request & {
  requestId?: string;
  user?: { id: string };
};

export function correlationId(
  req: RiveraRequest,
  res: Response,
  next: (error?: Error) => void,
) {
  const supplied = req.header("x-request-id");
  req.requestId =
    supplied && /^[A-Za-z0-9._:-]{8,80}$/.test(supplied)
      ? supplied
      : randomUUID();
  res.setHeader("x-request-id", req.requestId);
  next();
}

@Injectable()
export class ErrorMonitor {
  private readonly logger = new Logger("ErrorMonitor");
  capture(error: unknown, context: Record<string, unknown>) {
    if (process.env.ERROR_MONITORING_ENABLED !== "true") return;
    const message = error instanceof Error ? error.message : "Unknown error";
    this.logger.error(
      JSON.stringify({ event: "UNHANDLED_EXCEPTION", message, ...context }),
    );
  }
}

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger("HttpRequest");
  intercept(
    context: ExecutionContext,
    next: { handle(): Observable<unknown> },
  ) {
    const req = context.switchToHttp().getRequest<RiveraRequest>();
    const res = context.switchToHttp().getResponse<Response>();
    const started = Date.now();
    const write = (errorCode?: string) =>
      this.logger.log(
        JSON.stringify({
          requestId: req.requestId,
          userId: req.user?.id,
          route: req.route?.path ?? req.path,
          method: req.method,
          statusCode: res.statusCode,
          durationMs: Date.now() - started,
          service: "rivera-api",
          environment: process.env.NODE_ENV ?? "development",
          ...(errorCode ? { errorCode } : {}),
        }),
      );
    return next.handle().pipe(
      tap(() => write()),
      catchError((error: unknown) => {
        const body =
          error instanceof HttpException ? error.getResponse() : null;
        write(
          typeof body === "object" && body && "code" in body
            ? String((body as { code: unknown }).code)
            : "INTERNAL_ERROR",
        );
        return throwError(() => error);
      }),
    );
  }
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly monitor: ErrorMonitor) {}
  catch(error: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const req = context.getRequest<RiveraRequest>();
    const res = context.getResponse<Response>();
    const status =
      error instanceof HttpException
        ? error.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const response =
      error instanceof HttpException ? error.getResponse() : null;
    const safe =
      typeof response === "object" && response
        ? (response as Record<string, unknown>)
        : {
            statusCode: status,
            code: status === 500 ? "INTERNAL_ERROR" : "REQUEST_FAILED",
            message:
              status === 500
                ? "Something went wrong. Please try again."
                : String(response ?? "Request failed."),
          };
    if (status >= 500)
      this.monitor.capture(error, {
        requestId: req.requestId,
        route: req.path,
        method: req.method,
      });
    res.status(status).json({
      statusCode: status,
      code: String(safe.code ?? "REQUEST_FAILED"),
      message: safe.message ?? "Request failed.",
      requestId: req.requestId,
    });
  }
}
