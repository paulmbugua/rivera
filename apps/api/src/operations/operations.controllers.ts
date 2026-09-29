import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthGuard, AuthUser, Roles } from "../auth/guard";
import {
  CreateDataRequestDto,
  CreateSafetyReportDto,
  ModerateSafetyReportDto,
  ModerateUserDto,
  PreferenceDto,
  UpdateDataRequestDto,
} from "./operations.dto";
import { OperationsService } from "./operations.service";

@ApiTags("Health")
@Controller("health")
export class HealthController {
  constructor(private readonly operations: OperationsService) {}
  @Get()
  @ApiOperation({ summary: "Process liveness; does not check dependencies" })
  live() {
    return {
      status: "ok",
      service: "rivera-api",
      uptimeSeconds: Math.floor(process.uptime()),
    };
  }
  @Get("ready")
  @ApiOperation({
    summary: "Lightweight database and required-configuration readiness",
  })
  ready() {
    return this.operations.readiness();
  }
}

@ApiTags("Account operations")
@Controller()
@UseGuards(AuthGuard)
@Roles("CREATOR", "BUSINESS", "ADMIN")
@ApiCookieAuth("access-cookie")
export class UserOperationsController {
  constructor(private readonly operations: OperationsService) {}
  @Get("settings/notification-preferences")
  preferences(@CurrentUser() user: AuthUser) {
    return this.operations.preferences(user.id);
  }
  @Patch("settings/notification-preferences")
  preference(@CurrentUser() user: AuthUser, @Body() dto: PreferenceDto) {
    return this.operations.updatePreference(user.id, dto);
  }
  @Post("reports")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  report(@CurrentUser() user: AuthUser, @Body() dto: CreateSafetyReportDto) {
    return this.operations.report(user.id, dto);
  }
  @Get("settings/data-requests")
  dataRequests(@CurrentUser() user: AuthUser) {
    return this.operations.dataRequests(user.id);
  }
  @Post("settings/data-requests")
  @Throttle({ default: { limit: 2, ttl: 86400_000 } })
  createDataRequest(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateDataRequestDto,
  ) {
    return this.operations.createDataRequest(user.id, dto);
  }
}

@ApiTags("Admin operations")
@Controller("admin")
@UseGuards(AuthGuard)
@Roles("ADMIN")
@ApiCookieAuth("access-cookie")
export class AdminOperationsController {
  constructor(private readonly operations: OperationsService) {}
  @Get("reports") reports() {
    return this.operations.reports();
  }
  @Patch("reports/:id")
  report(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: ModerateSafetyReportDto,
  ) {
    return this.operations.moderateReport(user.id, id, dto);
  }
  @Get("support/search")
  search(@Query("q") q = "") {
    return this.operations.supportSearch(q);
  }
  @Patch("users/:id/status")
  moderateUser(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: ModerateUserDto,
  ) {
    return this.operations.moderateUser(user.id, id, dto);
  }
  @Get("analytics") analytics() {
    return this.operations.analytics();
  }
  @Get("data-requests") dataRequests() {
    return this.operations.adminDataRequests();
  }
  @Patch("data-requests/:id")
  dataRequest(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: UpdateDataRequestDto,
  ) {
    return this.operations.updateDataRequest(user.id, id, dto);
  }
}
