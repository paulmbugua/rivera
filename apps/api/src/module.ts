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
import { BusinessController, CreatorController, MarketplaceAdminController, TaxonomyController, VerificationController } from './marketplace/marketplace.controllers';
import { MarketplaceService } from './marketplace/marketplace.service';
import { LocalStorageService } from './storage/storage.service';
import { UploadsController } from './storage/uploads.controller';
import { BusinessCampaignController, CampaignAdminController, CampaignPublicController, CreatorCampaignController } from './campaigns/campaigns.controllers';
import { CampaignsService } from './campaigns/campaigns.service';
import { ApplicationAdminController, BusinessApplicationsController, CreatorApplicationsController, NotificationsController, PaymentWebhookController } from './applications/applications.controllers';
import { ApplicationsService } from './applications/applications.service';
import { CampaignEligibilityService } from './applications/eligibility.service';
import { ApplicationFeeService } from './applications/fee.service';
import { PAYMENT_PROVIDER, StripePaymentProvider } from './applications/payment.provider';
import { BusinessCollaborationController, CampaignParticipantsController, ConversationsController, CreatorCollaborationController } from './collaborations/collaborations.controllers';
import { CollaborationsService } from './collaborations/collaborations.service';
import { ApplicationStatusService } from './collaborations/application-status.service';
import { AdminReviewsController, BusinessWorkspaceController, CreatorWorkspaceController, ReviewsController } from './collaborations/workspace.controllers';
import { WorkspaceService } from './collaborations/workspace.service';
import { BusinessPaymentController, CreatorPayoutController, MarketplacePaymentAdminController, PaymentIssueController } from './payments/marketplace-payment.controllers';
import { MarketplacePaymentService } from './payments/marketplace-payment.service';
const duration = z.string().regex(/^\d+(s|m|h|d)$/);
const env = z.object({ DATABASE_URL: z.string().startsWith('postgresql://'), PORT: z.coerce.number().int().positive().default(4000), WEB_ORIGIN: z.string().url().default('http://localhost:3000'), APP_URL: z.string().url().default('http://localhost:3000'), JWT_ACCESS_SECRET: z.string().min(32), JWT_ACCESS_EXPIRES_IN: duration.default('15m'), JWT_REFRESH_EXPIRES_IN: duration.default('30d'), EMAIL_VERIFICATION_EXPIRES_IN: duration.default('24h'), PASSWORD_RESET_EXPIRES_IN: duration.default('1h'), COOKIE_SECURE: z.enum(['true','false']).default('false'), MAIL_PROVIDER: z.enum(['console','smtp']).default('console'), SMTP_SECURE: z.enum(['true','false']).optional(), STORAGE_PROVIDER: z.literal('local').default('local'), MAX_PROFILE_IMAGE_MB: z.coerce.number().positive().max(20).default(5), MAX_COVER_IMAGE_MB: z.coerce.number().positive().max(20).default(10), MAX_PORTFOLIO_IMAGE_MB: z.coerce.number().positive().max(20).default(10), MAX_DELIVERABLE_FILE_MB: z.coerce.number().positive().max(100).default(25), CAMPAIGN_REVIEW_REQUIRED: z.enum(['true','false']).default('false'), MAX_CAMPAIGN_CATEGORIES: z.coerce.number().int().min(1).max(10).default(5), MAX_CAMPAIGN_DELIVERABLES: z.coerce.number().int().min(1).max(50).default(20), MAX_CAMPAIGN_ATTACHMENTS: z.coerce.number().int().min(0).max(20).default(5), MAX_CAMPAIGN_ATTACHMENT_MB: z.coerce.number().positive().max(25).default(10), STRIPE_APPLICATION_FEE_ENABLED:z.enum(['true','false']).default('true'),DEFAULT_APPLICATION_FEE_MINOR:z.coerce.number().int().min(0).default(300),DEFAULT_APPLICATION_FEE_CURRENCY:z.string().regex(/^[A-Za-z]{3}$/).default('USD'),NEW_CREATOR_FREE_APPLICATIONS:z.coerce.number().int().min(0).max(100).default(3),APPLICATION_PAYMENT_EXPIRY_MINUTES:z.coerce.number().int().min(30).max(1440).default(30) });
function validate(config: Record<string, unknown>) { const value = env.parse(config); const smtpPassword = config.SMTP_PASS || config.SMTP_PASSWORD; const from = config.SMTP_FROM || config.MAIL_FROM || config.MAIL_FROM_ADDRESS; if (value.MAIL_PROVIDER === 'smtp' && (!config.SMTP_HOST || !config.SMTP_USER || !smtpPassword || !from)) throw new Error('SMTP mail requires host, user, password and sender configuration'); if (config.NODE_ENV === 'production' && (value.COOKIE_SECURE !== 'true' || !value.WEB_ORIGIN.startsWith('https://') || !value.APP_URL.startsWith('https://') || value.JWT_ACCESS_SECRET.startsWith('dev-only') || value.JWT_ACCESS_SECRET.startsWith('change-me') || value.MAIL_PROVIDER !== 'smtp')) throw new Error('Production requires HTTPS origins, a unique JWT secret, secure cookies and SMTP configuration'); if(config.NODE_ENV==='production'&&value.STRIPE_APPLICATION_FEE_ENABLED==='true'&&(!config.STRIPE_SECRET_KEY||!config.STRIPE_WEBHOOK_SECRET))throw new Error('Enabled Stripe fees require Stripe secret and webhook keys'); return value; }
@Controller('health') class HealthController { @Get() health() { return { status: 'ok', service: 'rivera-api' }; } }
@Module({ imports: [ConfigModule.forRoot({ isGlobal: true, validate }), ThrottlerModule.forRoot([{ ttl: 60_000, limit: 30 }])], controllers: [HealthController, AuthController, OnboardingController, AdminController, TaxonomyController, CreatorController, BusinessController, VerificationController, MarketplaceAdminController, UploadsController, CampaignPublicController, BusinessCampaignController, CreatorCampaignController, CampaignAdminController,CreatorApplicationsController,BusinessApplicationsController,NotificationsController,PaymentWebhookController,ApplicationAdminController,BusinessCollaborationController,CreatorCollaborationController,ConversationsController,CampaignParticipantsController,CreatorWorkspaceController,BusinessWorkspaceController,ReviewsController,AdminReviewsController,CreatorPayoutController,BusinessPaymentController,PaymentIssueController,MarketplacePaymentAdminController], providers: [PrismaService, AuthService, AuthGuard, MarketplaceService, CampaignsService,ApplicationsService,CampaignEligibilityService,ApplicationFeeService,CollaborationsService,ApplicationStatusService,WorkspaceService,MarketplacePaymentService,LocalStorageService, MailService, { provide: MAIL_PROVIDER, useFactory: () => process.env.MAIL_PROVIDER === 'smtp' ? new SmtpMailProvider() : new ConsoleMailProvider() },{provide:PAYMENT_PROVIDER,useFactory:()=>new StripePaymentProvider()}, { provide: APP_GUARD, useClass: ThrottlerGuard }] })
export class AppModule {}
