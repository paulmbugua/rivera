import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../common/prisma.service';
import { AuthGuard, Roles } from '../auth/guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { BusinessDto, CreatorDto } from './dto';
@ApiTags('Onboarding')
@UseGuards(AuthGuard)
@Controller('onboarding')
@ApiCookieAuth('access-cookie')
export class OnboardingController {
  constructor(private db: PrismaService) {}
  @Roles('BUSINESS') @Post('business') @ApiOperation({ summary: 'Create or complete the authenticated Business profile' }) @ApiResponse({ status: 403, schema: { example: { statusCode:403,code:'FORBIDDEN_ROLE',message:'You cannot access this area.' } } }) async business(@CurrentUser() user: { id: string }, @Body() dto: BusinessDto) {
    await this.db.businessProfile.upsert({ where: { userId: user.id }, create: { userId: user.id, name: dto.name.trim(), country: dto.country.toUpperCase(), city: dto.city.trim(), industry: dto.industry.trim(), description: dto.description.trim(), website: dto.website, onboardingCompleted: true }, update: { name: dto.name.trim(), country: dto.country.toUpperCase(), city: dto.city.trim(), industry: dto.industry.trim(), description: dto.description.trim(), website: dto.website, onboardingCompleted: true } });
    return { onboardingCompleted: true, next: '/dashboard/business' };
  }
  @Roles('CREATOR') @Post('creator') @ApiOperation({ summary: 'Create or complete the authenticated Creator profile' }) async creator(@CurrentUser() user: { id: string }, @Body() dto: CreatorDto) {
    await this.db.creatorProfile.upsert({ where: { userId: user.id }, create: { userId: user.id, displayName: dto.displayName.trim(), country: dto.country.toUpperCase(), city: dto.city.trim(), primaryCategory: dto.primaryCategory, primaryPlatform: dto.primaryPlatform, bio: dto.bio.trim(), onboardingCompleted: true }, update: { displayName: dto.displayName.trim(), country: dto.country.toUpperCase(), city: dto.city.trim(), primaryCategory: dto.primaryCategory, primaryPlatform: dto.primaryPlatform, bio: dto.bio.trim(), onboardingCompleted: true } });
    return { onboardingCompleted: true, next: '/dashboard/creator' };
  }
}
