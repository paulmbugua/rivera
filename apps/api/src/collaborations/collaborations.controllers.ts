import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthGuard, AuthUser, Roles } from "../auth/guard";
import { CollaborationsService } from "./collaborations.service";
import {
  MessageDto,
  MessageQueryDto,
  OfferDto,
  RejectApplicationDto,
} from "./dto";

@ApiTags("Business collaboration")
@UseGuards(AuthGuard)
@Roles("BUSINESS")
@ApiCookieAuth("access-cookie")
@Controller("business")
export class BusinessCollaborationController {
  constructor(private service: CollaborationsService) {}
  @Post("applications/:id/shortlist")
  @ApiOperation({
    summary:
      "Shortlist an owned Campaign Application and open Rivera messaging",
  })
  @ApiResponse({
    status: 201,
    description:
      "Application shortlisted and its single Conversation returned.",
  })
  @ApiResponse({ status: 403, description: "CAMPAIGN_OWNERSHIP_REQUIRED" })
  @ApiResponse({ status: 409, description: "INVALID_APPLICATION_TRANSITION" })
  shortlist(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.service.shortlist(user.id, id);
  }
  @Post("applications/:id/remove-shortlist") remove(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
  ) {
    return this.service.removeShortlist(user.id, id);
  }
  @Post("applications/:id/reject") reject(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: RejectApplicationDto,
  ) {
    return this.service.reject(user.id, id, dto);
  }
  @Post("applications/:id/offers")
  @ApiOperation({
    summary: "Send a versioned collaboration Offer to a shortlisted Creator",
  })
  @ApiResponse({
    status: 201,
    description: "Versioned Offer created; any prior SENT Offer is withdrawn.",
  })
  @ApiResponse({
    status: 409,
    description: "APPLICATION_NOT_SHORTLISTED or CONVERSATION_REQUIRED",
  })
  offer(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: OfferDto,
  ) {
    return this.service.sendOffer(user.id, id, dto);
  }
  @Post("offers/:id/withdraw") withdraw(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
  ) {
    return this.service.withdrawOffer(user.id, id);
  }
  @Get("campaigns/:campaignId/participants") participants(
    @CurrentUser() user: AuthUser,
    @Param("campaignId") campaignId: string,
  ) {
    return this.service.businessParticipants(user.id, campaignId);
  }
  @Get("campaigns/:campaignId/participants/:id") participant(
    @CurrentUser() user: AuthUser,
    @Param("campaignId") campaignId: string,
    @Param("id") id: string,
  ) {
    return this.service.businessParticipants(user.id, campaignId, id);
  }
  @Get("collaboration-summary") summary(@CurrentUser() user: AuthUser) {
    return this.service.dashboard(user.id, "BUSINESS");
  }
}

@ApiTags("Creator collaboration")
@UseGuards(AuthGuard)
@Roles("CREATOR")
@ApiCookieAuth("access-cookie")
@Controller("creators/me")
export class CreatorCollaborationController {
  constructor(private service: CollaborationsService) {}
  @Get("offers") offers(@CurrentUser() user: AuthUser) {
    return this.service.offers(user.id);
  }
  @Get("offers/:id") offer(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
  ) {
    return this.service.offer(user.id, id);
  }
  @Post("offers/:id/accept")
  @ApiOperation({
    summary:
      "Atomically accept an Offer, enforce Campaign capacity, and create the active participant",
  })
  @ApiResponse({
    status: 201,
    description: "Offer accepted and active CampaignParticipant created.",
  })
  @ApiResponse({
    status: 409,
    description:
      "OFFER_EXPIRED, OFFER_NOT_ACTIVE, CAMPAIGN_NOT_ACTIVE, or CAMPAIGN_SLOTS_FILLED",
  })
  accept(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.service.acceptOffer(user.id, id);
  }
  @Post("offers/:id/decline") decline(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
  ) {
    return this.service.declineOffer(user.id, id);
  }
  @Get("collaborations") collaborations(@CurrentUser() user: AuthUser) {
    return this.service.creatorCollaborations(user.id);
  }
  @Get("collaborations/:id") collaboration(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
  ) {
    return this.service.creatorCollaborations(user.id, id);
  }
  @Get("collaboration-summary") summary(@CurrentUser() user: AuthUser) {
    return this.service.dashboard(user.id, "CREATOR");
  }
}

@ApiTags("Rivera messaging")
@UseGuards(AuthGuard)
@Roles("CREATOR", "BUSINESS")
@ApiCookieAuth("access-cookie")
@Controller("conversations")
export class ConversationsController {
  constructor(private service: CollaborationsService) {}
  @Get() list(@CurrentUser() user: AuthUser) {
    return this.service.conversations(user.id);
  }
  @Get(":id/messages") messages(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Query() query: MessageQueryDto,
  ) {
    return this.service.messages(user.id, id, query);
  }
  @Post(":id/messages")
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({
    summary:
      "Send a plain-text message in an authorized active Application Conversation",
  })
  @ApiResponse({ status: 201, description: "Message created." })
  @ApiResponse({ status: 403, description: "CONVERSATION_ACCESS_DENIED" })
  @ApiResponse({ status: 409, description: "CONVERSATION_CLOSED" })
  send(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: MessageDto,
  ) {
    return this.service.sendMessage(user.id, id, dto);
  }
  @Post(":id/read") read(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
  ) {
    return this.service.markRead(user.id, id);
  }
}

@ApiTags("Campaign participants")
@UseGuards(AuthGuard)
@Roles("CREATOR", "BUSINESS")
@ApiCookieAuth("access-cookie")
@Controller("campaign-participants")
export class CampaignParticipantsController {
  constructor(private service: CollaborationsService) {}
  @Get(":id/contact")
  @ApiOperation({
    summary:
      "Return explicitly provided professional contacts to active collaboration participants only",
  })
  @ApiResponse({
    status: 200,
    description:
      "Creator and Business professional contact fields plus safety notice.",
  })
  @ApiResponse({ status: 403, description: "COLLABORATION_CONTACT_LOCKED" })
  contact(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.service.contact(user.id, id);
  }
}
