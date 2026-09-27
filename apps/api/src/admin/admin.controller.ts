import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../common/prisma.service';
import { AuthGuard, Roles } from '../auth/guard';

@ApiTags('Administration')
@Controller('admin')
@UseGuards(AuthGuard)
@Roles('ADMIN')
@ApiCookieAuth('access-cookie')
export class AdminController {
  constructor(private db: PrismaService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Return a minimal protected administration summary' })
  @ApiResponse({ status: 200, schema: { example: { users: 42, businesses: 12, creators: 29 } } })
  summary() {
    return this.db.$transaction([
      this.db.user.count({ where: { deletedAt: null } }),
      this.db.businessProfile.count(),
      this.db.creatorProfile.count(),
    ]).then(([users, businesses, creators]) => ({ users, businesses, creators }));
  }
}
