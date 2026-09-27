import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthGuard, Roles } from '../auth/guard';
import { BusinessProfileDto, CreatorProfileDto, DirectoryQueryDto, PortfolioDto, ReorderPortfolioDto, SocialAccountDto, TaxonomyDto, VerificationRequestDto, VerificationReviewDto } from './dto';
import { MarketplaceService } from './marketplace.service';

@ApiTags('Marketplace taxonomy')
@Controller()
export class TaxonomyController {
  constructor(private service: MarketplaceService) {}
  @Get('categories') @ApiOperation({ summary: 'List active creator categories' }) categories() { return this.service.categories(); }
  @Get('industries') @ApiOperation({ summary: 'List active business industries' }) industries() { return this.service.industries(); }
  @Get('content-types') @ApiOperation({ summary: 'List active creator content types' }) contentTypes() { return this.service.contentTypes(); }
}

@ApiTags('Creators')
@Controller('creators')
export class CreatorController {
  constructor(private service: MarketplaceService) {}
  @Get() @ApiOperation({ summary: 'Search public creators with server pagination' }) directory(@Query() query: DirectoryQueryDto) { return this.service.creators(query); }
  @UseGuards(AuthGuard) @Roles('CREATOR') @ApiCookieAuth('access-cookie') @Get('me/profile') owner(@CurrentUser() user: { id: string }) { return this.service.creatorOwner(user.id); }
  @UseGuards(AuthGuard) @Roles('CREATOR') @ApiCookieAuth('access-cookie') @Patch('me/profile') update(@CurrentUser() user: { id: string }, @Body() dto: CreatorProfileDto) { return this.service.updateCreator(user.id, dto); }
  @UseGuards(AuthGuard) @Roles('CREATOR') @ApiCookieAuth('access-cookie') @Post('me/publish') publish(@CurrentUser() user: { id: string }) { return this.service.publishCreator(user.id); }
  @UseGuards(AuthGuard) @Roles('CREATOR') @ApiCookieAuth('access-cookie') @Post('me/unpublish') unpublish(@CurrentUser() user: { id: string }) { return this.service.unpublishCreator(user.id); }
  @UseGuards(AuthGuard) @Roles('CREATOR') @ApiCookieAuth('access-cookie') @Get('me/completion') completion(@CurrentUser() user: { id: string }) { return this.service.creatorOwner(user.id).then(profile => ({ profileCompletion: profile.profileCompletion })); }
  @UseGuards(AuthGuard) @Roles('CREATOR') @ApiCookieAuth('access-cookie') @Get('me/social-accounts') socialList(@CurrentUser() user: { id: string }) { return this.service.socialList(user.id); }
  @UseGuards(AuthGuard) @Roles('CREATOR') @ApiCookieAuth('access-cookie') @Post('me/social-accounts') socialCreate(@CurrentUser() user: { id: string }, @Body() dto: SocialAccountDto) { return this.service.socialCreate(user.id, dto); }
  @UseGuards(AuthGuard) @Roles('CREATOR') @ApiCookieAuth('access-cookie') @Patch('me/social-accounts/:id') socialUpdate(@CurrentUser() user: { id: string }, @Param('id') id: string, @Body() dto: SocialAccountDto) { return this.service.socialUpdate(user.id, id, dto); }
  @UseGuards(AuthGuard) @Roles('CREATOR') @ApiCookieAuth('access-cookie') @Post('me/social-accounts/:id/primary') socialPrimary(@CurrentUser() user: { id: string }, @Param('id') id: string) { return this.service.socialPrimary(user.id, id); }
  @UseGuards(AuthGuard) @Roles('CREATOR') @ApiCookieAuth('access-cookie') @Delete('me/social-accounts/:id') socialDelete(@CurrentUser() user: { id: string }, @Param('id') id: string) { return this.service.socialDelete(user.id, id); }
  @UseGuards(AuthGuard) @Roles('CREATOR') @ApiCookieAuth('access-cookie') @Get('me/portfolio') portfolioList(@CurrentUser() user: { id: string }) { return this.service.portfolioList(user.id); }
  @UseGuards(AuthGuard) @Roles('CREATOR') @ApiCookieAuth('access-cookie') @Post('me/portfolio') portfolioCreate(@CurrentUser() user: { id: string }, @Body() dto: PortfolioDto) { return this.service.portfolioCreate(user.id, dto); }
  @UseGuards(AuthGuard) @Roles('CREATOR') @ApiCookieAuth('access-cookie') @Patch('me/portfolio/reorder') portfolioReorder(@CurrentUser() user: { id: string }, @Body() dto: ReorderPortfolioDto) { return this.service.portfolioReorder(user.id, dto); }
  @UseGuards(AuthGuard) @Roles('CREATOR') @ApiCookieAuth('access-cookie') @Patch('me/portfolio/:id') portfolioUpdate(@CurrentUser() user: { id: string }, @Param('id') id: string, @Body() dto: PortfolioDto) { return this.service.portfolioUpdate(user.id, id, dto); }
  @UseGuards(AuthGuard) @Roles('CREATOR') @ApiCookieAuth('access-cookie') @Delete('me/portfolio/:id') portfolioDelete(@CurrentUser() user: { id: string }, @Param('id') id: string) { return this.service.portfolioDelete(user.id, id); }
  @Get(':slug') @ApiOperation({ summary: 'Get a public or unlisted creator profile' }) publicProfile(@Param('slug') slug: string) { return this.service.creatorPublic(slug); }
}

@ApiTags('Businesses')
@Controller('businesses')
export class BusinessController {
  constructor(private service: MarketplaceService) {}
  @UseGuards(AuthGuard) @Roles('BUSINESS') @ApiCookieAuth('access-cookie') @Get('me/profile') owner(@CurrentUser() user: { id: string }) { return this.service.businessOwner(user.id); }
  @UseGuards(AuthGuard) @Roles('BUSINESS') @ApiCookieAuth('access-cookie') @Patch('me/profile') update(@CurrentUser() user: { id: string }, @Body() dto: BusinessProfileDto) { return this.service.updateBusiness(user.id, dto); }
  @UseGuards(AuthGuard) @Roles('BUSINESS') @ApiCookieAuth('access-cookie') @Post('me/publish') publish(@CurrentUser() user: { id: string }) { return this.service.publishBusiness(user.id); }
  @UseGuards(AuthGuard) @Roles('BUSINESS') @ApiCookieAuth('access-cookie') @Post('me/unpublish') unpublish(@CurrentUser() user: { id: string }) { return this.service.unpublishBusiness(user.id); }
  @UseGuards(AuthGuard) @Roles('BUSINESS') @ApiCookieAuth('access-cookie') @Get('me/completion') completion(@CurrentUser() user: { id: string }) { return this.service.businessOwner(user.id).then(profile => ({ profileCompletion: profile.profileCompletion })); }
  @Get(':slug') @ApiOperation({ summary: 'Get a public or unlisted business profile' }) publicProfile(@Param('slug') slug: string) { return this.service.businessPublic(slug); }
}

@ApiTags('Profile verification')
@UseGuards(AuthGuard)
@ApiCookieAuth('access-cookie')
@Controller('verifications')
export class VerificationController {
  constructor(private service: MarketplaceService) {}
  @Post('request') request(@CurrentUser() user: { id: string }, @Body() dto: VerificationRequestDto) { return this.service.requestVerification(user.id, dto); }
  @Get('my') mine(@CurrentUser() user: { id: string }) { return this.service.myVerifications(user.id); }
}

@ApiTags('Phase 3 administration')
@UseGuards(AuthGuard)
@Roles('ADMIN')
@ApiCookieAuth('access-cookie')
@Controller('admin')
export class MarketplaceAdminController {
  constructor(private service: MarketplaceService) {}
  @Get('creators') creators(@Query('q') q?: string) { return this.service.adminCreators(q); }
  @Get('businesses') businesses(@Query('q') q?: string) { return this.service.adminBusinesses(q); }
  @Get('verifications') verifications() { return this.service.adminVerifications(); }
  @Post('verifications/:id/approve') approve(@CurrentUser() admin: { id: string }, @Param('id') id: string, @Body() dto: VerificationReviewDto) { return this.service.reviewVerification(admin.id, id, true, dto); }
  @Post('verifications/:id/reject') reject(@CurrentUser() admin: { id: string }, @Param('id') id: string, @Body() dto: VerificationReviewDto) { return this.service.reviewVerification(admin.id, id, false, dto); }
  @Post('categories') createCategory(@Body() dto: TaxonomyDto) { return this.service.taxonomy('category', dto); }
  @Patch('categories/:id') updateCategory(@Param('id') id: string, @Body() dto: TaxonomyDto) { return this.service.taxonomy('category', dto, id); }
  @Post('industries') createIndustry(@Body() dto: TaxonomyDto) { return this.service.taxonomy('industry', dto); }
  @Patch('industries/:id') updateIndustry(@Param('id') id: string, @Body() dto: TaxonomyDto) { return this.service.taxonomy('industry', dto, id); }
  @Post('content-types') createContentType(@Body() dto: TaxonomyDto) { return this.service.taxonomy('contentType', dto); }
  @Patch('content-types/:id') updateContentType(@Param('id') id: string, @Body() dto: TaxonomyDto) { return this.service.taxonomy('contentType', dto, id); }
}

