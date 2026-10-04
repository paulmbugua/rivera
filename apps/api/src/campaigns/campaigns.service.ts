import { HttpStatus, Injectable } from '@nestjs/common';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ApplicationStatus, CampaignStatus, Prisma } from '@prisma/client';
import { ApiException } from '../common/api-error';
import { PrismaService } from '../common/prisma.service';
import { AttachmentDto, CampaignAdminDto, CampaignDto, CampaignQueryDto, OwnerCampaignQueryDto } from './dto';

const campaignInclude = {
  business: { select: { id: true, name: true, slug: true, logoUrl: true, shortDescription: true, verificationStatus: true, profileVisibility: true } },
  categories: { include: { category: true }, orderBy: { createdAt: 'asc' as const } },
  creatorLocations: true,
  platforms: true,
  languages: true,
  deliverables: { include: { contentType: true }, orderBy: { sortOrder: 'asc' as const } },
  attachments: true,
  _count: { select: { applications: { where: { status: { in: [ApplicationStatus.SUBMITTED, ApplicationStatus.VIEWED, ApplicationStatus.WITHDRAWN] } } } } },
};

@Injectable()
export class CampaignsService {
  constructor(private prisma: PrismaService) {}

  private fail(status: HttpStatus, code: string, message: string): never { throw new ApiException(status, code, message); }
  private slugify(value: string) { return value.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'campaign'; }
  private async uniqueSlug(title: string, excludeId?: string) {
    const base = this.slugify(title); let slug = base; let suffix = 2;
    while (await this.prisma.campaign.findFirst({ where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) }, select: { id: true } })) slug = `${base}-${suffix++}`;
    return slug;
  }
  private async businessFor(userId: string) {
    const business = await this.prisma.businessProfile.findUnique({ where: { userId }, include: { user: { select: { status: true } } } });
    if (!business) this.fail(HttpStatus.BAD_REQUEST, 'BUSINESS_PROFILE_REQUIRED', 'Complete your Business profile before managing campaigns.');
    return business;
  }
  private async creatorFor(userId: string) {
    const creator = await this.prisma.creatorProfile.findUnique({ where: { userId } });
    if (!creator) this.fail(HttpStatus.BAD_REQUEST, 'CREATOR_PROFILE_REQUIRED', 'Complete your Creator profile first.');
    return creator;
  }
  private async owned(userId: string, id: string) {
    const business = await this.businessFor(userId);
    const campaign = await this.prisma.campaign.findFirst({ where: { id, businessId: business.id, deletedAt: null }, include: campaignInclude });
    if (!campaign) this.fail(HttpStatus.FORBIDDEN, 'CAMPAIGN_OWNERSHIP_REQUIRED', 'You cannot manage this campaign.');
    return campaign;
  }
  private dates(dto: CampaignDto) {
    const date = (value?: string) => value ? new Date(value) : undefined;
    return { applicationDeadline: date(dto.applicationDeadline), campaignStartDate: date(dto.campaignStartDate), campaignEndDate: date(dto.campaignEndDate) };
  }
  private validateDates(dto: CampaignDto, publishing = false) {
    const deadline = dto.applicationDeadline && new Date(dto.applicationDeadline); const start = dto.campaignStartDate && new Date(dto.campaignStartDate); const end = dto.campaignEndDate && new Date(dto.campaignEndDate);
    if (start && end && end < start) this.fail(HttpStatus.BAD_REQUEST, 'INVALID_CAMPAIGN_DATES', 'Campaign end date must be on or after its start date.');
    if (deadline && end && deadline > end) this.fail(HttpStatus.BAD_REQUEST, 'INVALID_CAMPAIGN_DATES', 'Application deadline cannot be after the campaign end date.');
    if (deadline && start && deadline > start) this.fail(HttpStatus.BAD_REQUEST, 'INVALID_CAMPAIGN_DATES', 'Application deadline cannot be after the campaign start date.');
    if (publishing && deadline && deadline <= new Date()) this.fail(HttpStatus.BAD_REQUEST, 'DEADLINE_IN_PAST', 'Application deadline must be in the future.');
    if (dto.budgetMinMinor != null && dto.budgetMaxMinor != null && dto.budgetMaxMinor < dto.budgetMinMinor) this.fail(HttpStatus.BAD_REQUEST, 'INVALID_BUDGET_RANGE', 'Maximum budget must be at least the minimum budget.');
  }
  private scalar(dto: CampaignDto) {
    const omit = new Set(['categoryIds','creatorLocations','platforms','languages','deliverables','applicationDeadline','campaignStartDate','campaignEndDate']);
    const values = Object.fromEntries(Object.entries(dto).filter(([key]) => !omit.has(key) && dto[key as keyof CampaignDto] !== undefined));
    if (dto.locationType && ['GLOBAL','REMOTE'].includes(dto.locationType)) {
      return { ...values, campaignCountryCode: null, campaignCity: null, campaignRegion: null };
    }
    return values;
  }
  private nested(dto: CampaignDto, creating = false) {
    const replace = () => creating ? {} : { deleteMany: {} };
    const creatorLocations = dto.creatorLocations ??
      (dto.locationType && ['GLOBAL','REMOTE'].includes(dto.locationType) ? [] : undefined);
    return {
      ...(dto.categoryIds ? { categories: { ...replace(), create: dto.categoryIds.map((categoryId, index) => ({ categoryId, isPrimary: index === 0 })) } } : {}),
      ...(creatorLocations ? { creatorLocations: { ...replace(), create: creatorLocations.map(item => ({ ...item, countryCode: item.countryCode.toUpperCase() })) } } : {}),
      ...(dto.platforms ? { platforms: { ...replace(), create: dto.platforms } } : {}),
      ...(dto.languages ? { languages: { ...replace(), create: dto.languages.map(item => ({ ...item, languageCode: item.languageCode.toLowerCase() })) } } : {}),
      ...(dto.deliverables ? { deliverables: { ...replace(), create: dto.deliverables.map((item, index) => ({ title: item.title, description: item.description, quantity: item.quantity, platform: item.platform, contentTypeId: item.contentTypeId, dueDate: item.dueDate ? new Date(item.dueDate) : undefined, sortOrder: item.sortOrder ?? index })) } } : {}),
    };
  }
  private publicDto(campaign: any) {
    return {
      id: campaign.id, slug: campaign.slug, title: campaign.title, shortDescription: campaign.shortDescription,
      campaignObjective: campaign.campaignObjective, locationType: campaign.locationType, campaignCountryCode: campaign.campaignCountryCode,
      campaignCity: campaign.campaignCity, campaignRegion: campaign.campaignRegion, creatorLocations: campaign.creatorLocations,
      budgetMinMinor: campaign.budgetVisibility === 'PUBLIC' ? campaign.budgetMinMinor : null,
      budgetMaxMinor: campaign.budgetVisibility === 'PUBLIC' ? campaign.budgetMaxMinor : null,
      budgetVisibility: campaign.budgetVisibility, currencyCode: campaign.currencyCode, creatorSlots: campaign.creatorSlots,
      applicationDeadline: campaign.applicationDeadline, campaignStartDate: campaign.campaignStartDate, campaignEndDate: campaign.campaignEndDate,
      acceptingApplications: campaign.status === 'OPEN' && (!campaign.applicationDeadline || new Date(campaign.applicationDeadline) > new Date()),
      status: campaign.status, visibility: campaign.visibility, isFeatured: campaign.isFeatured, publishedAt: campaign.publishedAt,
      verifiedCreatorsOnly: campaign.verifiedCreatorsOnly,
      business: campaign.business,
      categories: campaign.categories.map((item: any) => ({ id: item.category.id, name: item.category.name, slug: item.category.slug, isPrimary: item.isPrimary })),
      platforms: campaign.platforms.map((item: any) => ({ platform: item.platform, required: item.required, minimumFollowers: item.minimumFollowers, preferredFollowers: item.preferredFollowers })),
      languages: campaign.languages,
      deliverables: campaign.deliverables.map((item: any) => ({ title: item.title, quantity: item.quantity, platform: item.platform, contentType: item.contentType ? { name: item.contentType.name, slug: item.contentType.slug } : null })),
      attachments: campaign.attachments.filter((item: any) => item.visibility === 'PUBLIC').map((item: any) => ({ name: item.name, fileUrl: item.fileUrl, mimeType: item.mimeType, fileSize: item.fileSize })),
    };
  }
  private ownerDto(campaign: any) { return { ...campaign, applicationsCount: campaign._count?.applications ?? 0, acceptingApplications: campaign.status === 'OPEN' && (!campaign.applicationDeadline || new Date(campaign.applicationDeadline) > new Date()) }; }
  private audit(campaignId:string,actorUserId:string,action:string,metadata?:Prisma.InputJsonValue){return this.prisma.campaignAuditLog.create({data:{campaignId,actorUserId,action,metadata}});}

  async create(userId: string, dto: CampaignDto) {
    const business = await this.businessFor(userId); this.validateDates(dto);
    const title = dto.title || 'Untitled campaign'; const slug = await this.uniqueSlug(title);
    return this.prisma.campaign.create({ data: { businessId: business.id, title, slug, ...this.scalar(dto), ...this.dates(dto), ...this.nested(dto, true) } as unknown as Prisma.CampaignUncheckedCreateInput, include: campaignInclude }).then(item => this.ownerDto(item));
  }
  async update(userId: string, id: string, dto: CampaignDto) {
    const campaign = await this.owned(userId, id); this.validateDates({ ...campaign, ...dto } as unknown as CampaignDto);
    const slug = dto.title && dto.title !== campaign.title ? await this.uniqueSlug(dto.title, id) : undefined;
    return this.prisma.campaign.update({ where: { id }, data: { ...this.scalar(dto), ...this.dates(dto), ...this.nested(dto), ...(slug ? { slug } : {}) } as Prisma.CampaignUpdateInput, include: campaignInclude }).then(item => this.ownerDto(item));
  }
  async ownerList(userId: string, query: OwnerCampaignQueryDto) {
    const business = await this.businessFor(userId); const where = { businessId: business.id, deletedAt: null, ...(query.status ? { status: query.status } : {}) };
    const [items,total] = await this.prisma.$transaction([this.prisma.campaign.findMany({ where, include: campaignInclude, orderBy: { updatedAt: 'desc' }, skip: (query.page-1)*query.limit, take: query.limit }), this.prisma.campaign.count({ where })]);
    return { items: items.map(item => this.ownerDto(item)), pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total/query.limit) } };
  }
  async ownerDetail(userId: string, id: string) { return this.ownerDto(await this.owned(userId, id)); }
  private publishErrors(c: any) {
    const errors: string[] = [];
    if (!c.title || c.title === 'Untitled campaign') errors.push('Campaign title');
    if (!c.shortDescription || c.shortDescription.length < 20) errors.push('Short description');
    if (!c.fullDescription || c.fullDescription.length < 50) errors.push('Full description');
    if (!c.campaignObjective) errors.push('Campaign objective');
    if (!c.locationType) errors.push('Location type');
    if (!c.categories.length) errors.push('At least one category');
    if (!c.platforms.length) errors.push('At least one Creator platform');
    if (!c.deliverables.length) errors.push('At least one deliverable');
    if (['LOCAL','NATIONAL'].includes(c.locationType) && !c.creatorLocations.length) errors.push('Creator target location');
    if (c.locationType === 'LOCAL' && !c.creatorLocations.some((l: any) => l.city)) errors.push('Local target city');
    if (c.creatorSlots < 1) errors.push('Creator slots');
    return errors;
  }
  async publish(userId: string, id: string) {
    const campaign = await this.owned(userId, id); const business = await this.businessFor(userId);
    if (!business.onboardingCompleted || business.user.status !== 'ACTIVE') this.fail(HttpStatus.BAD_REQUEST, 'BUSINESS_NOT_READY', 'Complete onboarding and activate your account before publishing.');
    this.validateDates({ ...campaign, applicationDeadline: campaign.applicationDeadline?.toISOString(), campaignStartDate: campaign.campaignStartDate?.toISOString(), campaignEndDate: campaign.campaignEndDate?.toISOString() } as unknown as CampaignDto, true);
    const errors = this.publishErrors(campaign); if (errors.length) this.fail(HttpStatus.BAD_REQUEST, 'CAMPAIGN_INCOMPLETE', `Complete these fields before publishing: ${errors.join(', ')}.`);
    const review = process.env.CAMPAIGN_REVIEW_REQUIRED === 'true';
    const updated=await this.prisma.campaign.update({ where: { id }, data: { status: review ? 'PENDING_REVIEW' : 'OPEN', visibility: campaign.visibility === 'PRIVATE' ? 'PUBLIC' : campaign.visibility, publishedAt: review ? null : new Date(), pausedAt: null, closedAt: null }, include: campaignInclude });
    await this.audit(id,userId,'CAMPAIGN_PUBLISHED',{status:updated.status}); return this.ownerDto(updated);
  }
  async lifecycle(userId: string, id: string, action: 'pause'|'resume'|'close'|'cancel') {
    const campaign = await this.owned(userId, id); let data: Prisma.CampaignUpdateInput;
    if (action === 'pause') { if (campaign.status !== 'OPEN') this.fail(HttpStatus.CONFLICT, 'INVALID_CAMPAIGN_STATE', 'Only open campaigns can be paused.'); data = { status: 'PAUSED', pausedAt: new Date() }; }
    else if (action === 'resume') { if (campaign.status !== 'PAUSED') this.fail(HttpStatus.CONFLICT, 'INVALID_CAMPAIGN_STATE', 'Only paused campaigns can be resumed.'); data = { status: 'OPEN', pausedAt: null }; }
    else if (action === 'close') { if (!['OPEN','PAUSED'].includes(campaign.status)) this.fail(HttpStatus.CONFLICT, 'INVALID_CAMPAIGN_STATE', 'Only open or paused campaigns can be closed.'); data = { status: 'CLOSED', closedAt: new Date() }; }
    else { if (['COMPLETED','CANCELLED'].includes(campaign.status)) this.fail(HttpStatus.CONFLICT, 'INVALID_CAMPAIGN_STATE', 'This campaign cannot be cancelled.'); data = { status: 'CANCELLED', closedAt: new Date() }; }
    const updated=await this.prisma.campaign.update({ where: { id }, data, include: campaignInclude }); const auditAction={pause:'CAMPAIGN_PAUSED',resume:'CAMPAIGN_RESUMED',close:'CAMPAIGN_CLOSED',cancel:'CAMPAIGN_CANCELLED'}[action]; await this.audit(id,userId,auditAction); return this.ownerDto(updated);
  }
  async duplicate(userId: string, id: string) {
    const source = await this.owned(userId, id); const title = `${source.title} (Copy)`; const slug = await this.uniqueSlug(title);
    return this.prisma.campaign.create({ data: { businessId: source.businessId, title, slug, shortDescription: source.shortDescription, fullDescription: source.fullDescription, productOrServiceName: source.productOrServiceName, productOrServiceDescription: source.productOrServiceDescription, productUrl: source.productUrl, campaignObjective: source.campaignObjective, otherObjective: source.otherObjective, targetAudience: source.targetAudience, expectedOutcomes: source.expectedOutcomes, budgetMinMinor: source.budgetMinMinor, budgetMaxMinor: source.budgetMaxMinor, currencyCode: source.currencyCode, budgetVisibility: source.budgetVisibility, creatorSlots: source.creatorSlots, locationType: source.locationType, campaignCountryCode: source.campaignCountryCode, campaignCity: source.campaignCity, campaignRegion: source.campaignRegion, physicalLocationDescription: source.physicalLocationDescription, verifiedCreatorsOnly: source.verifiedCreatorsOnly, usageRights: source.usageRights, usageRightsNotes: source.usageRightsNotes, productProvided: source.productProvided, travelExpensesCovered: source.travelExpensesCovered, specialInstructions: source.specialInstructions, status: 'DRAFT', visibility: 'PRIVATE', categories: { create: source.categories.map(item => ({ categoryId: item.categoryId, isPrimary: item.isPrimary })) }, creatorLocations: { create: source.creatorLocations.map(({countryCode,city,region}) => ({countryCode,city,region})) }, platforms: { create: source.platforms.map(({platform,required,minimumFollowers,preferredFollowers}) => ({platform,required,minimumFollowers,preferredFollowers})) }, languages: { create: source.languages.map(({languageCode,required}) => ({languageCode,required})) }, deliverables: { create: source.deliverables.map(({title,description,quantity,platform,contentTypeId,dueDate,sortOrder}) => ({title,description,quantity,platform,contentTypeId,dueDate,sortOrder})) } }, include: campaignInclude }).then(item => this.ownerDto(item));
  }
  async removeDraft(userId: string, id: string) { const c = await this.owned(userId,id); if (c.status !== 'DRAFT') this.fail(HttpStatus.CONFLICT,'DRAFT_ONLY','Only draft campaigns can be deleted.'); await this.prisma.campaign.delete({where:{id}}); return { deleted: true }; }
  async businessSummary(userId:string){const business=await this.businessFor(userId);const [active,drafts,closed,views]=await this.prisma.$transaction([this.prisma.campaign.count({where:{businessId:business.id,status:'OPEN',deletedAt:null}}),this.prisma.campaign.count({where:{businessId:business.id,status:'DRAFT',deletedAt:null}}),this.prisma.campaign.count({where:{businessId:business.id,status:{in:['CLOSED','CANCELLED','COMPLETED']},deletedAt:null}}),this.prisma.campaign.aggregate({where:{businessId:business.id,deletedAt:null},_sum:{viewCount:true}})]);return{activeCampaigns:active,draftCampaigns:drafts,closedCampaigns:closed,campaignViews:views._sum.viewCount??0};}
  async creatorSummary(userId:string){const creator=await this.creatorFor(userId);const [saved,newest,recommended]=await Promise.all([this.prisma.savedCampaign.count({where:{creatorId:creator.id,campaign:{status:'OPEN',visibility:'PUBLIC',deletedAt:null}}}),this.prisma.campaign.count({where:{status:'OPEN',visibility:'PUBLIC',deletedAt:null,OR:[{applicationDeadline:null},{applicationDeadline:{gt:new Date()}}]}}),this.recommended(userId)]);return{savedOpportunities:saved,newestOpportunities:newest,recommendedOpportunities:recommended.length};}

  async discovery(query: CampaignQueryDto) {
    const now = new Date(); const where: Prisma.CampaignWhereInput = { status: 'OPEN', visibility: 'PUBLIC', deletedAt: null, OR: [{ applicationDeadline: null }, { applicationDeadline: { gt: now } }] };
    if (query.q) where.AND = [{ OR: [{ title: { contains: query.q, mode: 'insensitive' } }, { shortDescription: { contains: query.q, mode: 'insensitive' } }, { productOrServiceName: { contains: query.q, mode: 'insensitive' } }] }];
    if (query.country) where.creatorLocations = { some: { countryCode: query.country } };
    if (query.city) where.creatorLocations = { some: { city: { contains: query.city, mode: 'insensitive' } } };
    if (query.category) where.categories = { some: { category: { slug: query.category } } };
    if (query.platform) where.platforms = { some: { platform: query.platform } };
    if (query.objective) where.campaignObjective = query.objective;
    if (query.locationType) where.locationType = query.locationType;
    if (query.remote) where.locationType = 'REMOTE';
    if (query.currencyCode) where.currencyCode = query.currencyCode;
    if (query.budgetMinMinor != null) where.budgetMaxMinor = { gte: query.budgetMinMinor };
    if (query.budgetMaxMinor != null) where.budgetMinMinor = { lte: query.budgetMaxMinor };
    if (query.closingBefore) where.applicationDeadline = { gt: now, lte: new Date(query.closingBefore) };
    const orderBy: Prisma.CampaignOrderByWithRelationInput = query.sort === 'deadline' ? { applicationDeadline: 'asc' } : query.sort === 'budget-high' ? { budgetMaxMinor: 'desc' } : query.sort === 'budget-low' ? { budgetMinMinor: 'asc' } : { publishedAt: 'desc' };
    const [items,total] = await this.prisma.$transaction([this.prisma.campaign.findMany({ where, include: campaignInclude, orderBy, skip: (query.page-1)*query.limit, take: query.limit }), this.prisma.campaign.count({ where })]);
    return { items: items.map(item => this.publicDto(item)), pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total/query.limit) } };
  }
  async publicDetail(slug: string) {
    const campaign = await this.prisma.campaign.findFirst({ where: { slug, status: 'OPEN', visibility: { in: ['PUBLIC','UNLISTED'] }, deletedAt: null }, include: campaignInclude });
    if (!campaign) this.fail(HttpStatus.NOT_FOUND,'CAMPAIGN_NOT_FOUND','Campaign not found.');
    void this.prisma.campaign.update({ where: { id: campaign.id }, data: { viewCount: { increment: 1 } } }).catch(() => undefined);
    return this.publicDto(campaign);
  }
  async save(userId: string, campaignId: string) { const creator = await this.creatorFor(userId); const campaign = await this.prisma.campaign.findFirst({where:{id:campaignId,status:'OPEN',visibility:{in:['PUBLIC','UNLISTED']},deletedAt:null}}); if(!campaign)this.fail(HttpStatus.NOT_FOUND,'CAMPAIGN_NOT_FOUND','Campaign not found.'); await this.prisma.savedCampaign.upsert({where:{creatorId_campaignId:{creatorId:creator.id,campaignId}},create:{creatorId:creator.id,campaignId},update:{}}); return {saved:true}; }
  async unsave(userId: string, campaignId: string) { const creator=await this.creatorFor(userId); await this.prisma.savedCampaign.deleteMany({where:{creatorId:creator.id,campaignId}}); return {saved:false}; }
  async saved(userId: string, query: CampaignQueryDto) { const creator=await this.creatorFor(userId); const where:Prisma.SavedCampaignWhereInput={creatorId:creator.id,campaign:{status:'OPEN' as CampaignStatus,visibility:{in:['PUBLIC','UNLISTED']},deletedAt:null}}; const [rows,total]=await this.prisma.$transaction([this.prisma.savedCampaign.findMany({where,include:{campaign:{include:campaignInclude}},orderBy:{createdAt:'desc'},skip:(query.page-1)*query.limit,take:query.limit}),this.prisma.savedCampaign.count({where})]); return {items:rows.map(row=>({...this.publicDto(row.campaign),savedAt:row.createdAt})),pagination:{page:query.page,limit:query.limit,total,pages:Math.ceil(total/query.limit)}}; }
  async recommended(userId: string) {
    const creator=await this.prisma.creatorProfile.findUnique({where:{userId},include:{categories:true,languages:true,socialAccounts:true}}); if(!creator)this.fail(HttpStatus.BAD_REQUEST,'CREATOR_PROFILE_REQUIRED','Complete your Creator profile first.');
    const campaigns=await this.prisma.campaign.findMany({where:{status:'OPEN',visibility:'PUBLIC',deletedAt:null,OR:[{applicationDeadline:null},{applicationDeadline:{gt:new Date()}}]},include:campaignInclude,take:100});
    const categoryIds=new Set(creator.categories.map(x=>x.categoryId)); const platforms=new Set(creator.socialAccounts.map(x=>x.platform)); const languages=new Set(creator.languages.map(x=>x.languageCode));
    return campaigns.map(c=>{let score=0;const reasons:string[]=[];if(c.categories.some(x=>categoryIds.has(x.categoryId))){score+=35;reasons.push('Matches your categories');}if(c.platforms.some(x=>platforms.has(x.platform))){score+=25;reasons.push('Matches your platforms');}if(c.locationType==='GLOBAL'||c.locationType==='REMOTE'){score+=15;reasons.push(c.locationType==='REMOTE'?'Remote opportunity':'Open worldwide');}else if(c.creatorLocations.some(x=>x.countryCode===creator.country)){score+=20;reasons.push('Matches your location');}if(c.languages.some(x=>languages.has(x.languageCode))){score+=10;reasons.push('Matches your languages');}if(!c.verifiedCreatorsOnly||creator.verificationStatus==='VERIFIED')score+=5;return{...this.publicDto(c),matchScore:score,reasons};}).filter(x=>x.matchScore>0).sort((a,b)=>b.matchScore-a.matchScore).slice(0,20);
  }
  async attachment(userId:string,id:string,dto:AttachmentDto){await this.owned(userId,id);const max=Number(process.env.MAX_CAMPAIGN_ATTACHMENTS??5);if(await this.prisma.campaignAttachment.count({where:{campaignId:id}})>=max)this.fail(HttpStatus.BAD_REQUEST,'ATTACHMENT_LIMIT','Campaign attachment limit reached.');if(dto.fileSize>Number(process.env.MAX_CAMPAIGN_ATTACHMENT_MB??10)*1024*1024)this.fail(HttpStatus.BAD_REQUEST,'FILE_TOO_LARGE','Campaign attachment is too large.');return this.prisma.campaignAttachment.create({data:{campaignId:id,...dto}});}
  async deleteAttachment(userId:string,campaignId:string,attachmentId:string){await this.owned(userId,campaignId);await this.prisma.campaignAttachment.deleteMany({where:{id:attachmentId,campaignId}});return{deleted:true};}
  async adminList(query:CampaignQueryDto){const where:Prisma.CampaignWhereInput={deletedAt:null,...(query.q?{OR:[{title:{contains:query.q,mode:'insensitive'}},{business:{name:{contains:query.q,mode:'insensitive'}}}]}:{})};const [items,total]=await this.prisma.$transaction([this.prisma.campaign.findMany({where,include:campaignInclude,orderBy:{updatedAt:'desc'},skip:(query.page-1)*query.limit,take:query.limit}),this.prisma.campaign.count({where})]);return{items:items.map(x=>this.ownerDto(x)),pagination:{page:query.page,limit:query.limit,total,pages:Math.ceil(total/query.limit)}};}
  async adminDetail(id:string){const c=await this.prisma.campaign.findUnique({where:{id},include:campaignInclude});if(!c)this.fail(HttpStatus.NOT_FOUND,'CAMPAIGN_NOT_FOUND','Campaign not found.');return this.ownerDto(c);}
  async adminUpdate(adminUserId:string,id:string,dto:CampaignAdminDto){await this.adminDetail(id);const updated=await this.prisma.campaign.update({where:{id},data:dto,include:campaignInclude});if(dto.status||dto.visibility!==undefined)await this.audit(id,adminUserId,dto.status==='CANCELLED'?'CAMPAIGN_REMOVED_BY_ADMIN':'CAMPAIGN_MODERATED',{status:dto.status??null,visibility:dto.visibility??null});return this.ownerDto(updated);}
}
