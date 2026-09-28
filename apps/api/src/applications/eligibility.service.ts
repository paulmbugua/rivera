import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { ApiException } from '../common/api-error';

@Injectable()
export class CampaignEligibilityService {
  constructor(private db: PrismaService) {}
  async inspect(userId: string, campaignId: string) {
    const [creator, campaign] = await Promise.all([
      this.db.creatorProfile.findUnique({ where: { userId }, include: { categories: true, socialAccounts: true } }),
      this.db.campaign.findUnique({ where: { id: campaignId }, include: { platforms: true } }),
    ]);
    if (!creator) throw new ApiException(HttpStatus.BAD_REQUEST, 'CREATOR_PROFILE_INCOMPLETE', 'Complete your Creator profile before submitting a proposal.');
    if (!campaign || campaign.deletedAt || campaign.visibility === 'PRIVATE') throw new ApiException(HttpStatus.NOT_FOUND, 'CAMPAIGN_NOT_FOUND', 'Campaign not found.');
    const blockingReasons: string[] = [];
    const advisoryWarnings: string[] = [];
    if (!creator.onboardingCompleted || !creator.displayName || !creator.headline || !creator.bio || !creator.country || !creator.categories.length || !creator.socialAccounts.length) blockingReasons.push('CREATOR_PROFILE_INCOMPLETE');
    if (campaign.status !== 'OPEN' || campaign.applicationDeadline && campaign.applicationDeadline <= new Date()) blockingReasons.push('CAMPAIGN_NOT_ACCEPTING_APPLICATIONS');
    if (campaign.verifiedCreatorsOnly && creator.verificationStatus !== 'VERIFIED') blockingReasons.push('VERIFIED_CREATOR_REQUIRED');
    for (const requirement of campaign.platforms.filter(item => item.required && item.minimumFollowers)) {
      const account = creator.socialAccounts.find(item => item.platform === requirement.platform);
      if (!account || account.followers < (requirement.minimumFollowers ?? 0)) advisoryWarnings.push(`${requirement.platform}_FOLLOWERS_BELOW_REQUIREMENT`);
    }
    return { canApply: blockingReasons.length === 0, blockingReasons, advisoryWarnings, creator, campaign };
  }
  async require(userId: string, campaignId: string) {
    const result = await this.inspect(userId, campaignId);
    if (!result.canApply) throw new ApiException(HttpStatus.BAD_REQUEST, result.blockingReasons[0] ?? 'CREATOR_NOT_ELIGIBLE', result.blockingReasons[0] === 'CAMPAIGN_NOT_ACCEPTING_APPLICATIONS' ? 'This Campaign is no longer accepting proposals.' : 'Your Creator profile does not meet this Campaign’s requirements.');
    return result;
  }
}
