import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class ApplicationFeeService {
  constructor(private db: PrismaService) {}
  async resolve(campaignId: string, creatorId: string) {
    const now = new Date();
    const [creator, campaign] = await Promise.all([
      this.db.creatorProfile.findUniqueOrThrow({ where: { id: creatorId } }),
      this.db.campaign.findUniqueOrThrow({ where: { id: campaignId }, include: { categories: { orderBy: { isPrimary: 'desc' } } } }),
    ]);
    const categoryIds = campaign.categories.map(item => item.categoryId);
    const rules = await this.db.applicationFeeRule.findMany({ where: { active: true, AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gt: now } }] }, { OR: [{ countryCode: null }, { countryCode: creator.country }] }, { OR: [{ categoryId: null }, { categoryId: { in: categoryIds } }] }] }, orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }] });
    const score = (rule: {countryCode:string|null;categoryId:string|null}) => rule.countryCode && rule.categoryId ? 4 : rule.countryCode ? 3 : rule.categoryId ? 2 : 1;
    const rule = rules.sort((a,b)=>score(b)-score(a)||b.priority-a.priority)[0];
    if (rule) return { amountMinor: rule.amountMinor, currencyCode: rule.currencyCode, ruleId: rule.id };
    return { amountMinor: Number(process.env.DEFAULT_APPLICATION_FEE_MINOR ?? 300), currencyCode: (process.env.DEFAULT_APPLICATION_FEE_CURRENCY ?? 'USD').toUpperCase(), ruleId: null };
  }
}
