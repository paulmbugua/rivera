import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './module';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  const origin = process.env.WEB_ORIGIN ?? 'http://localhost:3000';
  app.enableCors({ origin, credentials: true });
  app.use(helmet());
  app.use(cookieParser());
  app.use((req: { method: string; headers: { origin?: string; referer?: string }; cookies?: Record<string, string> }, _res: unknown, next: (error?: Error) => void) => {
    if (['POST','PUT','PATCH','DELETE'].includes(req.method) && req.headers.origin && req.headers.origin !== origin) return next(new BadRequestException('Request origin is not allowed'));
    if (['POST','PUT','PATCH','DELETE'].includes(req.method) && !req.headers.origin && req.headers.referer && !req.headers.referer.startsWith(origin + '/')) return next(new BadRequestException('Request origin is not allowed'));
    if (['POST','PUT','PATCH','DELETE'].includes(req.method) && !req.headers.origin && (req.cookies?.rivera_access || req.cookies?.rivera_refresh)) return next(new BadRequestException('Request origin is required'));
    next();
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  const document = SwaggerModule.createDocument(app, new DocumentBuilder().setTitle('Rivera API').setVersion('0.2').build());
  if (process.env.NODE_ENV !== 'production') SwaggerModule.setup('api/docs', app, document);
  await app.listen(Number(process.env.PORT ?? 4000), '0.0.0.0');
}
bootstrap();
