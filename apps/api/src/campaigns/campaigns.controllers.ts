import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
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
import { CampaignsService } from "./campaigns.service";
import {
  AttachmentDto,
  CampaignAdminDto,
  CampaignDto,
  CampaignQueryDto,
  OwnerCampaignQueryDto,
} from "./dto";

@ApiTags("Campaign marketplace")
@Controller("campaigns")
export class CampaignPublicController {
  constructor(private service: CampaignsService) {}
  @Get()
  @ApiOperation({
    summary: "Discover active public campaigns",
    description:
      "Returns only the safe public summary. Expired, paused, closed, draft, private and unlisted campaigns are excluded.",
  })
  @ApiResponse({
    status: 200,
    description: "Bounded paginated campaign summaries.",
  })
  discover(@Query() query: CampaignQueryDto) {
    return this.service.discovery(query);
  }
  @Get(":slug")
  @ApiOperation({ summary: "Read a safe public or unlisted campaign summary" })
  publicDetail(@Param("slug") slug: string) {
    return this.service.publicDetail(slug);
  }
}

@ApiTags("Business campaigns")
@UseGuards(AuthGuard)
@Roles("BUSINESS")
@ApiCookieAuth("access-cookie")
@Controller("business/campaigns")
export class BusinessCampaignController {
  constructor(private service: CampaignsService) {}
  @Post()
  @Throttle({ default: { limit: 10, ttl: 3600_000 } })
  @ApiOperation({
    summary: "Create an incomplete draft campaign",
    description:
      "Draft saves use relaxed validation. Nested requirements are created transactionally.",
  })
  create(@CurrentUser() user: AuthUser, @Body() dto: CampaignDto) {
    return this.service.create(user.id, dto);
  }
  @Get("summary/dashboard") summary(@CurrentUser() user: AuthUser) {
    return this.service.businessSummary(user.id);
  }
  @Get()
  @ApiOperation({ summary: "List the authenticated Business campaigns" })
  list(@CurrentUser() user: AuthUser, @Query() query: OwnerCampaignQueryDto) {
    return this.service.ownerList(user.id, query);
  }
  @Get(":id")
  @ApiOperation({ summary: "Read the full owner campaign brief" })
  detail(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.service.ownerDetail(user.id, id);
  }
  @Patch(":id")
  @ApiOperation({ summary: "Update a draft or published campaign" })
  update(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: CampaignDto,
  ) {
    return this.service.update(user.id, id, dto);
  }
  @Post(":id/publish")
  @ApiOperation({ summary: "Validate and publish a campaign" })
  publish(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.service.publish(user.id, id);
  }
  @Post(":id/pause") pause(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
  ) {
    return this.service.lifecycle(user.id, id, "pause");
  }
  @Post(":id/resume") resume(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
  ) {
    return this.service.lifecycle(user.id, id, "resume");
  }
  @Post(":id/close") close(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
  ) {
    return this.service.lifecycle(user.id, id, "close");
  }
  @Post(":id/cancel") cancel(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
  ) {
    return this.service.lifecycle(user.id, id, "cancel");
  }
  @Post(":id/duplicate") duplicate(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
  ) {
    return this.service.duplicate(user.id, id);
  }
  @Delete(":id") remove(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
  ) {
    return this.service.removeDraft(user.id, id);
  }
  @Post(":id/attachments") attachment(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: AttachmentDto,
  ) {
    return this.service.attachment(user.id, id, dto);
  }
  @Delete(":id/attachments/:attachmentId") deleteAttachment(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Param("attachmentId") attachmentId: string,
  ) {
    return this.service.deleteAttachment(user.id, id, attachmentId);
  }
}

@ApiTags("Creator opportunities")
@UseGuards(AuthGuard)
@Roles("CREATOR")
@ApiCookieAuth("access-cookie")
@Controller("creator/campaigns")
export class CreatorCampaignController {
  constructor(private service: CampaignsService) {}
  @Get("summary/dashboard") summary(@CurrentUser() user: AuthUser) {
    return this.service.creatorSummary(user.id);
  }
  @Post(":id/save") save(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
  ) {
    return this.service.save(user.id, id);
  }
  @Delete(":id/save") unsave(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
  ) {
    return this.service.unsave(user.id, id);
  }
  @Get("saved/list") saved(
    @CurrentUser() user: AuthUser,
    @Query() query: CampaignQueryDto,
  ) {
    return this.service.saved(user.id, query);
  }
  @Get("recommended/list") recommended(@CurrentUser() user: AuthUser) {
    return this.service.recommended(user.id);
  }
}

@ApiTags("Campaign administration")
@UseGuards(AuthGuard)
@Roles("ADMIN")
@ApiCookieAuth("access-cookie")
@Controller("admin/campaigns")
export class CampaignAdminController {
  constructor(private service: CampaignsService) {}
  @Get() list(@Query() query: CampaignQueryDto) {
    return this.service.adminList(query);
  }
  @Get(":id") detail(@Param("id") id: string) {
    return this.service.adminDetail(id);
  }
  @Patch(":id") update(
    @CurrentUser() admin: AuthUser,
    @Param("id") id: string,
    @Body() dto: CampaignAdminDto,
  ) {
    return this.service.adminUpdate(admin.id, id, dto);
  }
}
