import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.enableCors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000' });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  const document = SwaggerModule.createDocument(app, new DocumentBuilder().setTitle('Rivera API').setVersion('0.1').build());
  if (process.env.NODE_ENV !== 'production') SwaggerModule.setup('api/docs', app, document);
  await app.listen(Number(process.env.PORT ?? 4000), '0.0.0.0');
}
bootstrap();
