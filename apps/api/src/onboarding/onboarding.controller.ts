import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../common/prisma.service';
import { AuthGuard, AuthRequest, Roles } from '../auth/guard';
import { BusinessDto, CreatorDto } from './dto';
@ApiTags('Onboarding')
@UseGuards(AuthGuard)
@Controller('onboarding')
export class OnboardingController {
  constructor(private db: PrismaService) {}
  @Roles('BUSINESS') @Post('business') async business(@Req() req: AuthRequest, @Body() dto: BusinessDto) {
    await this.db.businessProfile.upsert({ where: { userId: req.user.id }, create: { userId: req.user.id, name: dto.name.trim(), country: dto.country.trim(), city: dto.city.trim(), industry: dto.industry.trim(), description: dto.description.trim(), website: dto.website, onboardingCompleted: true }, update: { name: dto.name.trim(), country: dto.country.trim(), city: dto.city.trim(), industry: dto.industry.trim(), description: dto.description.trim(), website: dto.website, onboardingCompleted: true } });
    return { onboardingCompleted: true, next: '/dashboard/business' };
  }
  @Roles('CREATOR') @Post('creator') async creator(@Req() req: AuthRequest, @Body() dto: CreatorDto) {
    await this.db.creatorProfile.upsert({ where: { userId: req.user.id }, create: { userId: req.user.id, displayName: dto.displayName.trim(), country: dto.country.trim(), city: dto.city.trim(), primaryCategory: dto.primaryCategory, primaryPlatform: dto.primaryPlatform, bio: dto.bio.trim(), onboardingCompleted: true }, update: { displayName: dto.displayName.trim(), country: dto.country.trim(), city: dto.city.trim(), primaryCategory: dto.primaryCategory, primaryPlatform: dto.primaryPlatform, bio: dto.bio.trim(), onboardingCompleted: true } });
    return { onboardingCompleted: true, next: '/dashboard/creator' };
  }
}
