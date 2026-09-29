import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  RawBodyRequest,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Request } from "express";
import { Throttle } from "@nestjs/throttler";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthGuard, AuthUser, Roles } from "../auth/guard";
import { ApplicationsService } from "./applications.service";
import {
  ApplicationQueryDto,
  CreditGrantDto,
  FeeRuleDto,
  ProposalDto,
  RefundDto,
} from "./dto";

@ApiTags("Creator applications")
@UseGuards(AuthGuard)
@Roles("CREATOR")
@ApiCookieAuth("access-cookie")
@Controller()
export class CreatorApplicationsController {
  constructor(private service: ApplicationsService) {}
  @Get("campaigns/:campaignId/eligibility")
  @ApiOperation({
    summary: "Check the authenticated Creator’s Campaign eligibility",
  })
  eligibility(
    @CurrentUser() user: AuthUser,
    @Param("campaignId") campaignId: string,
  ) {
    return this.service.eligibilityPreview(user.id, campaignId);
  }
  @Get("campaigns/:campaignId/application-fee")
  @ApiOperation({
    summary: "Preview the server-resolved Rivera Application Fee",
  })
  fee(@CurrentUser() user: AuthUser, @Param("campaignId") campaignId: string) {
    return this.service.feePreview(user.id, campaignId);
  }
  @Post("campaigns/:campaignId/applications/draft")
  @Throttle({ default: { limit: 10, ttl: 3600_000 } })
  @ApiOperation({
    summary: "Create one editable proposal draft for a Campaign",
  })
  @ApiResponse({ status: 409, description: "APPLICATION_ALREADY_EXISTS" })
  create(
    @CurrentUser() user: AuthUser,
    @Param("campaignId") campaignId: string,
    @Body() dto: ProposalDto,
  ) {
    return this.service.createDraft(user.id, campaignId, dto);
  }
  @Get("creators/me/applications/summary") summary(
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.creatorSummary(user.id);
  }
  @Get("creators/me/applications") list(
    @CurrentUser() user: AuthUser,
    @Query() query: ApplicationQueryDto,
  ) {
    return this.service.mine(user.id, query);
  }
  @Get("creators/me/applications/:id") detail(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
  ) {
    return this.service.detail(user.id, id);
  }
  @Patch("creators/me/applications/:id") update(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: ProposalDto,
  ) {
    return this.service.update(user.id, id, dto);
  }
  @Post("creators/me/applications/:id/review") review(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
  ) {
    return this.service.review(user.id, id);
  }
  @Post("creators/me/applications/:id/use-credit") credit(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
  ) {
    return this.service.useCredit(user.id, id);
  }
  @Post("creators/me/applications/:id/checkout")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary: "Create Stripe-hosted Checkout for the backend-calculated fee",
  })
  checkout(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.service.checkout(user.id, id);
  }
  @Get("creators/me/applications/:id/payment-status") status(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
  ) {
    return this.service.paymentStatus(user.id, id);
  }
  @Post("creators/me/applications/:id/withdraw") withdraw(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
  ) {
    return this.service.withdraw(user.id, id);
  }
  @Get("creators/me/application-credits") credits(
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.credits(user.id);
  }
  @Get("creators/me/payments") payments(@CurrentUser() user: AuthUser) {
    return this.service.payments(user.id);
  }
  @Get("creator/campaigns/:campaignId/unlocked") unlocked(
    @CurrentUser() user: AuthUser,
    @Param("campaignId") campaignId: string,
  ) {
    return this.service.unlocked(user.id, campaignId);
  }
}

@ApiTags("Business applications")
@UseGuards(AuthGuard)
@Roles("BUSINESS")
@ApiCookieAuth("access-cookie")
@Controller("business")
export class BusinessApplicationsController {
  constructor(private service: ApplicationsService) {}
  @Get("applications/summary") summary(@CurrentUser() user: AuthUser) {
    return this.service.businessSummary(user.id);
  }
  @Get("campaigns/:campaignId/applications")
  @ApiOperation({
    summary:
      "List submitted, viewed and withdrawn proposals for an owned Campaign",
  })
  list(
    @CurrentUser() user: AuthUser,
    @Param("campaignId") campaignId: string,
    @Query() query: ApplicationQueryDto,
  ) {
    return this.service.businessList(user.id, campaignId, query);
  }
  @Get("campaigns/:campaignId/applications/:id")
  @ApiOperation({ summary: "View a proposal and mark it VIEWED once" })
  detail(
    @CurrentUser() user: AuthUser,
    @Param("campaignId") campaignId: string,
    @Param("id") id: string,
  ) {
    return this.service.businessDetail(user.id, campaignId, id);
  }
}

@ApiTags("Notifications")
@UseGuards(AuthGuard)
@Roles("CREATOR", "BUSINESS", "ADMIN")
@ApiCookieAuth("access-cookie")
@Controller("notifications")
export class NotificationsController {
  constructor(private service: ApplicationsService) {}
  @Get() list(@CurrentUser() user: AuthUser) {
    return this.service.notifications(user.id);
  }
  @Patch(":id/read") read(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
  ) {
    return this.service.markNotificationRead(user.id, id);
  }
}

@ApiTags("Application payments")
@Controller("payments")
export class PaymentWebhookController {
  constructor(private service: ApplicationsService) {}
  @Post("webhooks/stripe")
  @ApiOperation({
    summary:
      "Stripe signature-authenticated webhook; no user cookie authentication",
  })
  webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers("stripe-signature") signature?: string,
  ) {
    return this.service.handleWebhook(
      req.rawBody ?? Buffer.from(""),
      signature,
    );
  }
}

@ApiTags("Application administration")
@UseGuards(AuthGuard)
@Roles("ADMIN")
@ApiCookieAuth("access-cookie")
@Controller("admin")
export class ApplicationAdminController {
  constructor(private service: ApplicationsService) {}
  @Get("applications") applications(@Query() query: ApplicationQueryDto) {
    return this.service.adminApplications(query);
  }
  @Get("application-fees") fees() {
    return this.service.feeRules();
  }
  @Post("application-fees") createFee(@Body() dto: FeeRuleDto) {
    return this.service.createFeeRule(dto);
  }
  @Patch("application-fees/:id") updateFee(
    @Param("id") id: string,
    @Body() dto: FeeRuleDto,
  ) {
    return this.service.updateFeeRule(id, dto);
  }
  @Post("creators/:creatorId/application-credits") credits(
    @CurrentUser() admin: AuthUser,
    @Param("creatorId") creatorId: string,
    @Body() dto: CreditGrantDto,
  ) {
    return this.service.grantCredits(admin.id, creatorId, dto);
  }
  @Get("payments") payments() {
    return this.service.adminPayments();
  }
  @Get("payments/:id") payment(@Param("id") id: string) {
    return this.service.adminPayment(id);
  }
  @Post("payments/:id/refund") refund(
    @CurrentUser() admin: AuthUser,
    @Param("id") id: string,
    @Body() dto: RefundDto,
  ) {
    return this.service.refund(admin.id, id, dto);
  }
}
