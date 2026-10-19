import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthGuard, AuthUser, Roles } from "../auth/guard";
import {
  FeeSettingsDto,
  OpenPaymentIssueDto,
  PayoutAccountOnboardDto,
  RefundCollaborationDto,
  ResolvePaymentIssueDto,
} from "./marketplace-payment.dto";
import { MarketplacePaymentService } from "./marketplace-payment.service";
import { WisePayoutService } from './wise-payout.service';
import { WiseAccountDto, WiseApproveDto, WiseCompleteDto, WiseVerifyDto } from './wise-payout.dto';

@ApiTags("Creator payouts")
@UseGuards(AuthGuard)
@Roles("CREATOR")
@ApiCookieAuth("access-cookie")
@Controller("creators/me")
export class CreatorPayoutController {
  constructor(private service: MarketplacePaymentService, private wise:WisePayoutService) {}
  @Post('payout-account/wise')
  @Throttle({default:{limit:2,ttl:60_000}})
  saveWise(@CurrentUser() u:AuthUser,@Body() dto:WiseAccountDto){return this.wise.save(u.id,dto);}
  @Post('payout-account/wise/verify')
  @Throttle({default:{limit:5,ttl:60_000}})
  verifyWise(@CurrentUser() u:AuthUser,@Body() dto:WiseVerifyDto){return this.wise.verify(u.id,dto.code);}
  @Get("payout-account") account(@CurrentUser() u: AuthUser) {
    return this.service.payoutAccount(u.id);
  }
  @Post("payout-account/onboard")
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @ApiOperation({
    summary: "Create or continue the configured provider payout setup",
  })
  @ApiResponse({
    status: 201,
    description:
      "Returns provider-hosted onboarding or activates a verified Kenyan M-Pesa recipient.",
  })
  @ApiResponse({ status: 403, description: "COLLABORATION_PAYMENT_ACCESS_DENIED" })
  @ApiResponse({ status: 409, description: "COLLABORATION_NOT_AWAITING_FUNDING" })
  @ApiResponse({ status: 503, description: "PAYMENT_PROVIDER_UNAVAILABLE" })
  onboard(@CurrentUser() u: AuthUser, @Body() dto: PayoutAccountOnboardDto) {
    return this.service.onboard(u.id, dto);
  }
  @Post("payout-account/sync") sync(@CurrentUser() u: AuthUser) {
    return this.service.syncPayoutAccount(u.id);
  }
  @Get("earnings") earnings(@CurrentUser() u: AuthUser) {
    return this.service.creatorEarnings(u.id);
  }
  @Get("transfers") transfers(@CurrentUser() u: AuthUser) {
    return this.service.creatorTransfers(u.id);
  }
}

@ApiTags("Business collaboration payments")
@UseGuards(AuthGuard)
@Roles("BUSINESS")
@ApiCookieAuth("access-cookie")
@Controller("business")
export class BusinessPaymentController {
  constructor(private service: MarketplacePaymentService) {}
  @Post("campaign-participants/:id/payment")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary:
      "Create provider-hosted funding checkout using server-calculated compensation and fee",
  })
  fund(@CurrentUser() u: AuthUser, @Param("id") id: string) {
    return this.service.fund(u.id, id);
  }
  @Get("collaboration-payments") list(@CurrentUser() u: AuthUser) {
    return this.service.businessPayments(u.id);
  }
  @Get("collaboration-payments/:id") detail(
    @CurrentUser() u: AuthUser,
    @Param("id") id: string,
  ) {
    return this.service.businessPayment(u.id, id);
  }
  @Post("collaboration-payments/:id/release")
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  release(@CurrentUser() u: AuthUser, @Param("id") id: string) {
    return this.service.release(u.id, id);
  }
}

@ApiTags("Payment issues")
@UseGuards(AuthGuard)
@Roles("CREATOR", "BUSINESS", "ADMIN")
@ApiCookieAuth("access-cookie")
@Controller("payment-issues")
export class PaymentIssueController {
  constructor(private service: MarketplacePaymentService) {}
  @Post() @Throttle({ default: { limit: 5, ttl: 60_000 } }) create(
    @CurrentUser() u: AuthUser,
    @Body() dto: OpenPaymentIssueDto,
  ) {
    return this.service.openIssue(u.id, dto);
  }
  @Get(":id") get(@CurrentUser() u: AuthUser, @Param("id") id: string) {
    return this.service.issue(u.id, id, u.roles.includes("ADMIN"));
  }
}

@ApiTags("Admin financial operations")
@UseGuards(AuthGuard)
@Roles("ADMIN")
@ApiCookieAuth("access-cookie")
@Controller("admin")
export class MarketplacePaymentAdminController {
  constructor(private service: MarketplacePaymentService, private wise:WisePayoutService) {}
  @Get('wise-payouts') wiseQueue(){return this.wise.dashboard();}
  @Post('wise-payout-accounts/:id/approve')
  @Throttle({default:{limit:5,ttl:60_000}})
  approveWise(@CurrentUser() u:AuthUser,@Param('id') id:string,@Body() dto:WiseApproveDto){return this.wise.approve(u.id,id,dto);}
  @Post('wise-payouts/:id/claim')
  @Throttle({default:{limit:5,ttl:60_000}})
  claimWise(@CurrentUser() u:AuthUser,@Param('id') id:string){return this.wise.claim(u.id,id);}
  @Post('wise-payouts/:id/complete')
  @Throttle({default:{limit:5,ttl:60_000}})
  completeWise(@CurrentUser() u:AuthUser,@Param('id') id:string,@Body() dto:WiseCompleteDto){return this.wise.complete(u.id,id,dto);}
  @Get("collaboration-payments") payments() {
    return this.service.adminPayments();
  }
  @Post("collaboration-payments/:id/refund")
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  refund(
    @CurrentUser() u: AuthUser,
    @Param("id") id: string,
    @Body() dto: RefundCollaborationDto,
  ) {
    return this.service.adminRefund(u.id, id, dto);
  }
  @Post("collaboration-payments/:id/reconcile") reconcile(
    @Param("id") id: string,
  ) {
    return this.service.reconcile(id);
  }
  @Get("transfers") transfers() {
    return this.service.adminTransfers();
  }
  @Get("refunds") refunds() {
    return this.service.adminRefunds();
  }
  @Get("payment-issues") issues() {
    return this.service.adminIssues();
  }
  @Patch("payment-issues/:id") issue(
    @CurrentUser() u: AuthUser,
    @Param("id") id: string,
    @Body() dto: ResolvePaymentIssueDto,
  ) {
    return this.service.resolveIssue(u.id, id, dto);
  }
  @Get("payout-accounts") accounts() {
    return this.service.adminPayoutAccounts();
  }
  @Post("payout-accounts/:id/reconcile") reconcileAccount(
    @Param("id") id: string,
  ) {
    return this.service.reconcilePayoutAccount(id);
  }
  @Get("marketplace-fees") fees() {
    return this.service.feeSettings();
  }
  @Patch("marketplace-fees") updateFees(@Body() dto: FeeSettingsDto) {
    return this.service.updateFeeSettings(dto);
  }
}
