import { Module, Controller, Get } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { z } from 'zod';
import { PrismaService } from './common/prisma.service';
import { AuthService } from './auth/auth.service';
import { AuthController } from './auth/auth.controller';
import { AuthGuard } from './auth/guard';
import { ConsoleMailProvider, MAIL_PROVIDER, MailService, SmtpMailProvider } from './auth/mail.service';
import { OnboardingController } from './onboarding/onboarding.controller';
import { AdminController } from './admin/admin.controller';
const duration = z.string().regex(/^\d+(s|m|h|d)$/);
const env = z.object({ DATABASE_URL: z.string().startsWith('postgresql://'), PORT: z.coerce.number().int().positive().default(4000), WEB_ORIGIN: z.string().url().default('http://localhost:3000'), APP_URL: z.string().url().default('http://localhost:3000'), JWT_ACCESS_SECRET: z.string().min(32), JWT_ACCESS_EXPIRES_IN: duration.default('15m'), JWT_REFRESH_EXPIRES_IN: duration.default('30d'), EMAIL_VERIFICATION_EXPIRES_IN: duration.default('24h'), PASSWORD_RESET_EXPIRES_IN: duration.default('1h'), COOKIE_SECURE: z.enum(['true','false']).default('false'), MAIL_PROVIDER: z.enum(['console','smtp']).default('console') });
function validate(config: Record<string, unknown>) { const value = env.parse(config); if (config.NODE_ENV === 'production' && (value.COOKIE_SECURE !== 'true' || !value.WEB_ORIGIN.startsWith('https://') || !value.APP_URL.startsWith('https://') || value.JWT_ACCESS_SECRET.startsWith('dev-only') || value.JWT_ACCESS_SECRET.startsWith('change-me') || value.MAIL_PROVIDER !== 'smtp' || !config.SMTP_HOST || (!config.SMTP_FROM && !config.MAIL_FROM))) throw new Error('Production requires HTTPS origins, a unique JWT secret, secure cookies and SMTP configuration'); return value; }
@Controller('health') class HealthController { @Get() health() { return { status: 'ok', service: 'rivera-api' }; } }
@Module({ imports: [ConfigModule.forRoot({ isGlobal: true, validate }), ThrottlerModule.forRoot([{ ttl: 60_000, limit: 30 }])], controllers: [HealthController, AuthController, OnboardingController, AdminController], providers: [PrismaService, AuthService, AuthGuard, MailService, { provide: MAIL_PROVIDER, useFactory: () => process.env.MAIL_PROVIDER === 'smtp' ? new SmtpMailProvider() : new ConsoleMailProvider() }, { provide: APP_GUARD, useClass: ThrottlerGuard }] })
export class AppModule {}
