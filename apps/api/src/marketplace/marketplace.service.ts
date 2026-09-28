import { HttpStatus, Injectable } from "@nestjs/common";
import { Prisma, VerificationProfileType } from "@prisma/client";
import { PrismaService } from "../common/prisma.service";
import { ApiException } from "../common/api-error";
import {
  AdminModerationDto,
  BusinessProfileDto,
  CreatorProfileDto,
  DirectoryQueryDto,
  PortfolioDto,
  ReorderPortfolioDto,
  SocialAccountDto,
  TaxonomyDto,
  VerificationRequestDto,
  VerificationReviewDto,
} from "./dto";

const reservedSlugs = new Set([
  "admin",
  "api",
  "login",
  "register",
  "dashboard",
  "settings",
  "creators",
  "businesses",
  "campaigns",
]);
const creatorInclude = {
  categories: {
    include: { category: true },
    orderBy: { createdAt: "asc" as const },
  },
  contentTypes: {
    include: { contentType: true },
    orderBy: { createdAt: "asc" as const },
  },
  languages: { orderBy: { languageCode: "asc" as const } },
  socialAccounts: {
    orderBy: [{ isPrimary: "desc" as const }, { followers: "desc" as const }],
  },
  portfolio: {
    orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }],
  },
};
type CreatorWithRelations = Prisma.CreatorProfileGetPayload<{
  include: typeof creatorInclude;
}>;
type BusinessWithIndustry = Prisma.BusinessProfileGetPayload<{
  include: { industryRef: true };
}>;

export const slugBase = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72) || "profile";

@Injectable()
export class MarketplaceService {
  constructor(private db: PrismaService) {}

  private error(status: HttpStatus, code: string, message: string): never {
    throw new ApiException(status, code, message);
  }
  private async uniqueSlug(
    kind: "creator" | "business",
    requested: string,
    currentId?: string,
  ) {
    const base = slugBase(requested);
    if (reservedSlugs.has(base))
      this.error(
        HttpStatus.BAD_REQUEST,
        "RESERVED_PROFILE_SLUG",
        "This profile URL is reserved.",
      );
    for (let suffix = 1; suffix < 1000; suffix++) {
      const slug = suffix === 1 ? base : `${base}-${suffix}`;
      const found =
        kind === "creator"
          ? await this.db.creatorProfile.findUnique({ where: { slug } })
          : await this.db.businessProfile.findUnique({ where: { slug } });
      if (!found || found.id === currentId) return slug;
    }
    this.error(
      HttpStatus.CONFLICT,
      "PROFILE_SLUG_UNAVAILABLE",
      "This profile URL is already in use.",
    );
  }

  private creatorCompletion(profile: CreatorWithRelations) {
    return (
      (profile.displayName ? 20 : 0) +
      (profile.headline && profile.bio ? 15 : 0) +
      (profile.country && profile.city ? 10 : 0) +
      (profile.profileImageUrl ? 10 : 0) +
      (profile.categories?.length ? 10 : 0) +
      (profile.contentTypes?.length ? 10 : 0) +
      (profile.socialAccounts?.length ? 15 : 0) +
      (profile.portfolio?.length ? 10 : 0)
    );
  }
  private businessCompletion(profile: BusinessWithIndustry) {
    return (
      (profile.name ? 15 : 0) +
      (profile.description ? 20 : 0) +
      (profile.industryId ? 15 : 0) +
      (profile.country && profile.city ? 15 : 0) +
      (profile.logoUrl ? 10 : 0) +
      (profile.website ? 10 : 0) +
      (profile.businessEmail || profile.businessPhone ? 5 : 0) +
      (profile.coverImageUrl ? 5 : 0) +
      (profile.yearEstablished || profile.employeeSize ? 5 : 0)
    );
  }
  private async ownerCreator(userId: string) {
    const profile = await this.db.creatorProfile.findUnique({
      where: { userId },
      include: creatorInclude,
    });
    if (!profile)
      this.error(
        HttpStatus.NOT_FOUND,
        "CREATOR_PROFILE_NOT_FOUND",
        "Complete creator onboarding first.",
      );
    return profile;
  }
  private async ownerBusiness(userId: string) {
    const profile = await this.db.businessProfile.findUnique({
      where: { userId },
      include: { industryRef: true },
    });
    if (!profile)
      this.error(
        HttpStatus.NOT_FOUND,
        "BUSINESS_PROFILE_NOT_FOUND",
        "Complete business onboarding first.",
      );
    return profile;
  }

  async creatorOwner(userId: string) {
    const profile = await this.ownerCreator(userId);
    const completion = this.creatorCompletion(profile);
    if (completion !== profile.profileCompletion)
      await this.db.creatorProfile.update({
        where: { id: profile.id },
        data: { profileCompletion: completion },
      });
    return {
      ...profile,
      countryCode: profile.country,
      profileCompletion: completion,
      combinedFollowers: profile.socialAccounts.reduce(
        (sum, item) => sum + item.followers,
        0,
      ),
    };
  }
  async updateCreator(userId: string, dto: CreatorProfileDto) {
    const profile = await this.ownerCreator(userId);
    const slug = dto.slug
      ? await this.uniqueSlug("creator", dto.slug, profile.id)
      : profile.slug;
    if (
      dto.categoryIds &&
      dto.primaryCategoryId &&
      !dto.categoryIds.includes(dto.primaryCategoryId)
    )
      this.error(
        HttpStatus.BAD_REQUEST,
        "INVALID_PRIMARY_CATEGORY",
        "Primary category must be one of the selected categories.",
      );
    if (dto.categoryIds) {
      const count = await this.db.category.count({
        where: { id: { in: dto.categoryIds }, active: true },
      });
      if (count !== dto.categoryIds.length)
        this.error(
          HttpStatus.BAD_REQUEST,
          "INVALID_CATEGORY",
          "Select active Rivera categories only.",
        );
    }
    if (dto.contentTypeIds) {
      const count = await this.db.contentType.count({
        where: { id: { in: dto.contentTypeIds }, active: true },
      });
      if (count !== dto.contentTypeIds.length)
        this.error(
          HttpStatus.BAD_REQUEST,
          "INVALID_CONTENT_TYPE",
          "Select active Rivera content types only.",
        );
    }
    await this.db.$transaction(async (tx) => {
      await tx.creatorProfile.update({
        where: { id: profile.id },
        data: {
          displayName: dto.displayName?.trim(),
          slug,
          headline: dto.headline?.trim(),
          bio: dto.bio?.trim(),
          country: dto.countryCode?.toUpperCase(),
          city: dto.city?.trim(),
          websiteUrl: dto.websiteUrl || undefined,
          professionalContactEmail: dto.professionalContactEmail?.trim(),
          professionalPhone: dto.professionalPhone?.trim(),
          preferredContactMethod: dto.preferredContactMethod,
          yearsExperience: dto.yearsExperience,
          travelAvailable: dto.travelAvailable,
          remoteCampaignsAllowed: dto.remoteCampaignsAllowed,
          minimumRateMinor: dto.minimumRateMinor,
          minimumRateCurrency: dto.minimumRateCurrency,
          profileVisibility: dto.profileVisibility,
        },
      });
      if (dto.categoryIds) {
        await tx.creatorCategory.deleteMany({
          where: { creatorId: profile.id },
        });
        await tx.creatorCategory.createMany({
          data: dto.categoryIds.map((id) => ({
            creatorId: profile.id,
            categoryId: id,
            isPrimary: id === dto.primaryCategoryId,
          })),
        });
      }
      if (dto.contentTypeIds) {
        await tx.creatorContentType.deleteMany({
          where: { creatorId: profile.id },
        });
        await tx.creatorContentType.createMany({
          data: dto.contentTypeIds.map((id) => ({
            creatorId: profile.id,
            contentTypeId: id,
          })),
        });
      }
      if (dto.languages) {
        await tx.creatorLanguage.deleteMany({
          where: { creatorId: profile.id },
        });
        if (dto.languages.length)
          await tx.creatorLanguage.createMany({
            data: dto.languages.map((item) => ({
              creatorId: profile.id,
              languageCode: item.languageCode.toLowerCase(),
              proficiency: item.proficiency,
            })),
          });
      }
    });
    const updated = await this.ownerCreator(userId);
    const completion = this.creatorCompletion(updated);
    await this.db.creatorProfile.update({
      where: { id: profile.id },
      data: { profileCompletion: completion },
    });
    return this.creatorOwner(userId);
  }
  async publishCreator(userId: string) {
    const profile = await this.ownerCreator(userId);
    const missing: string[] = [];
    if (!profile.displayName) missing.push("display name");
    if (!profile.headline) missing.push("headline");
    if (!profile.bio) missing.push("bio");
    if (!profile.country || !profile.city) missing.push("location");
    if (!profile.categories.length) missing.push("category");
    if (!profile.socialAccounts.length) missing.push("social account");
    if (!profile.contentTypes.length) missing.push("content type");
    if (missing.length)
      this.error(
        HttpStatus.BAD_REQUEST,
        "PROFILE_INCOMPLETE",
        `Before publishing, add: ${missing.join(", ")}.`,
      );
    const completion = this.creatorCompletion(profile);
    await this.db.creatorProfile.update({
      where: { id: profile.id },
      data: {
        profileVisibility: "PUBLIC",
        publishedAt: profile.publishedAt ?? new Date(),
        profileCompletion: completion,
      },
    });
    return this.creatorOwner(userId);
  }
  async unpublishCreator(userId: string) {
    const profile = await this.ownerCreator(userId);
    await this.db.creatorProfile.update({
      where: { id: profile.id },
      data: { profileVisibility: "PRIVATE", publishedAt: null },
    });
    return { profileVisibility: "PRIVATE" };
  }

  private publicCreator(profile: CreatorWithRelations) {
    return {
      slug: profile.slug,
      displayName: profile.displayName,
      headline: profile.headline,
      bio: profile.bio,
      countryCode: profile.country,
      city: profile.city,
      profileImageUrl: profile.profileImageUrl,
      coverImageUrl: profile.coverImageUrl,
      websiteUrl: profile.websiteUrl,
      yearsExperience: profile.yearsExperience,
      travelAvailable: profile.travelAvailable,
      remoteCampaignsAllowed: profile.remoteCampaignsAllowed,
      verificationStatus: profile.verificationStatus,
      isFeatured: profile.isFeatured,
      categories: profile.categories.map((item) => ({
        ...item.category,
        isPrimary: item.isPrimary,
      })),
      contentTypes: profile.contentTypes.map((item) => item.contentType),
      languages: profile.languages,
      socialAccounts: profile.socialAccounts,
      portfolio: profile.portfolio.filter((item) => item.published),
      combinedFollowers: profile.socialAccounts.reduce(
        (sum, item) => sum + item.followers,
        0,
      ),
    };
  }
  async creatorPublic(slug: string) {
    const profile = await this.db.creatorProfile.findUnique({
      where: { slug },
      include: creatorInclude,
    });
    if (
      !profile ||
      !profile.publishedAt ||
      !["PUBLIC", "UNLISTED"].includes(profile.profileVisibility)
    )
      this.error(
        HttpStatus.NOT_FOUND,
        "CREATOR_PROFILE_NOT_FOUND",
        "Creator profile not found.",
      );
    return this.publicCreator(profile);
  }
  async creators(query: DirectoryQueryDto) {
    const where: Prisma.CreatorProfileWhereInput = {
      profileVisibility: "PUBLIC",
      publishedAt: { not: null },
      ...(query.country ? { country: query.country.toUpperCase() } : {}),
      ...(query.verified ? { verificationStatus: "VERIFIED" } : {}),
      ...(query.q
        ? {
            OR: [
              { displayName: { contains: query.q, mode: "insensitive" } },
              { headline: { contains: query.q, mode: "insensitive" } },
              { city: { contains: query.q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(query.category
        ? {
            categories: {
              some: { category: { slug: query.category, active: true } },
            },
          }
        : {}),
      ...(query.platform
        ? { socialAccounts: { some: { platform: query.platform } } }
        : {}),
    };
    const orderBy: Prisma.CreatorProfileOrderByWithRelationInput =
      query.sort === "name" ? { displayName: "asc" } : { publishedAt: "desc" };
    const [total, profiles] = await this.db.$transaction([
      this.db.creatorProfile.count({ where }),
      this.db.creatorProfile.findMany({
        where,
        include: creatorInclude,
        orderBy,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
    ]);
    const items = profiles.map((profile) => this.publicCreator(profile));
    if (query.sort === "followers")
      items.sort((a, b) => b.combinedFollowers - a.combinedFollowers);
    return {
      items,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        pages: Math.ceil(total / query.limit),
      },
    };
  }

  async socialList(userId: string) {
    return (await this.ownerCreator(userId)).socialAccounts;
  }
  async socialCreate(userId: string, dto: SocialAccountDto) {
    const profile = await this.ownerCreator(userId);
    if (!dto.username && !dto.profileUrl)
      this.error(
        HttpStatus.BAD_REQUEST,
        "SOCIAL_IDENTITY_REQUIRED",
        "Enter a username or profile URL.",
      );
    if (
      dto.username &&
      (await this.db.creatorSocialAccount.findFirst({
        where: {
          creatorId: profile.id,
          platform: dto.platform,
          username: { equals: dto.username, mode: "insensitive" },
        },
      }))
    )
      this.error(
        HttpStatus.CONFLICT,
        "SOCIAL_ACCOUNT_EXISTS",
        "This social account is already listed.",
      );
    return this.db.$transaction(async (tx) => {
      if (dto.isPrimary)
        await tx.creatorSocialAccount.updateMany({
          where: { creatorId: profile.id },
          data: { isPrimary: false },
        });
      const count = await tx.creatorSocialAccount.count({
        where: { creatorId: profile.id },
      });
      return tx.creatorSocialAccount.create({
        data: {
          creatorId: profile.id,
          platform: dto.platform,
          username: dto.username?.trim(),
          profileUrl: dto.profileUrl,
          followers: dto.followers,
          averageViews: dto.averageViews,
          engagementRate: dto.engagementRate,
          isPrimary: dto.isPrimary ?? count === 0,
        },
      });
    });
  }
  async socialUpdate(userId: string, id: string, dto: SocialAccountDto) {
    const profile = await this.ownerCreator(userId);
    const item = await this.db.creatorSocialAccount.findFirst({
      where: { id, creatorId: profile.id },
    });
    if (!item)
      this.error(
        HttpStatus.NOT_FOUND,
        "SOCIAL_ACCOUNT_NOT_FOUND",
        "Social account not found.",
      );
    return this.db.$transaction(async (tx) => {
      if (dto.isPrimary)
        await tx.creatorSocialAccount.updateMany({
          where: { creatorId: profile.id },
          data: { isPrimary: false },
        });
      return tx.creatorSocialAccount.update({
        where: { id },
        data: {
          platform: dto.platform,
          username: dto.username?.trim(),
          profileUrl: dto.profileUrl,
          followers: dto.followers,
          averageViews: dto.averageViews,
          engagementRate: dto.engagementRate,
          isPrimary: dto.isPrimary,
        },
      });
    });
  }
  async socialPrimary(userId: string, id: string) {
    const profile = await this.ownerCreator(userId);
    if (
      !(await this.db.creatorSocialAccount.findFirst({
        where: { id, creatorId: profile.id },
      }))
    )
      this.error(
        HttpStatus.NOT_FOUND,
        "SOCIAL_ACCOUNT_NOT_FOUND",
        "Social account not found.",
      );
    await this.db.$transaction([
      this.db.creatorSocialAccount.updateMany({
        where: { creatorId: profile.id },
        data: { isPrimary: false },
      }),
      this.db.creatorSocialAccount.update({
        where: { id },
        data: { isPrimary: true },
      }),
    ]);
    return { primaryId: id };
  }
  async socialDelete(userId: string, id: string) {
    const profile = await this.ownerCreator(userId);
    const item = await this.db.creatorSocialAccount.findFirst({
      where: { id, creatorId: profile.id },
    });
    if (!item)
      this.error(
        HttpStatus.NOT_FOUND,
        "SOCIAL_ACCOUNT_NOT_FOUND",
        "Social account not found.",
      );
    await this.db.creatorSocialAccount.delete({ where: { id } });
    if (item.isPrimary) {
      const next = await this.db.creatorSocialAccount.findFirst({
        where: { creatorId: profile.id },
        orderBy: { followers: "desc" },
      });
      if (next)
        await this.db.creatorSocialAccount.update({
          where: { id: next.id },
          data: { isPrimary: true },
        });
    }
    return { deleted: true };
  }

  async portfolioList(userId: string) {
    return (await this.ownerCreator(userId)).portfolio;
  }
  async portfolioCreate(userId: string, dto: PortfolioDto) {
    const profile = await this.ownerCreator(userId);
    if (!dto.mediaUrl && !dto.externalUrl)
      this.error(
        HttpStatus.BAD_REQUEST,
        "PORTFOLIO_URL_REQUIRED",
        "Add uploaded media or a safe external link.",
      );
    const count = await this.db.portfolioItem.count({
      where: { creatorId: profile.id },
    });
    if (count >= 20)
      this.error(
        HttpStatus.BAD_REQUEST,
        "PORTFOLIO_LIMIT_REACHED",
        "A creator can add up to 20 portfolio items.",
      );
    return this.db.portfolioItem.create({
      data: { creatorId: profile.id, ...dto, sortOrder: count },
    });
  }
  async portfolioUpdate(userId: string, id: string, dto: PortfolioDto) {
    const profile = await this.ownerCreator(userId);
    if (
      !(await this.db.portfolioItem.findFirst({
        where: { id, creatorId: profile.id },
      }))
    )
      this.error(
        HttpStatus.NOT_FOUND,
        "PORTFOLIO_ITEM_NOT_FOUND",
        "Portfolio item not found.",
      );
    return this.db.portfolioItem.update({ where: { id }, data: dto });
  }
  async portfolioDelete(userId: string, id: string) {
    const profile = await this.ownerCreator(userId);
    if (
      !(await this.db.portfolioItem.findFirst({
        where: { id, creatorId: profile.id },
      }))
    )
      this.error(
        HttpStatus.NOT_FOUND,
        "PORTFOLIO_ITEM_NOT_FOUND",
        "Portfolio item not found.",
      );
    await this.db.portfolioItem.delete({ where: { id } });
    return { deleted: true };
  }
  async portfolioReorder(userId: string, dto: ReorderPortfolioDto) {
    const profile = await this.ownerCreator(userId);
    const count = await this.db.portfolioItem.count({
      where: { creatorId: profile.id, id: { in: dto.ids } },
    });
    if (count !== dto.ids.length)
      this.error(
        HttpStatus.FORBIDDEN,
        "PORTFOLIO_OWNERSHIP_REQUIRED",
        "One or more portfolio items do not belong to you.",
      );
    await this.db.$transaction(
      dto.ids.map((id, sortOrder) =>
        this.db.portfolioItem.update({ where: { id }, data: { sortOrder } }),
      ),
    );
    return { reordered: true };
  }

  async businessOwner(userId: string) {
    const profile = await this.ownerBusiness(userId);
    const completion = this.businessCompletion(profile);
    if (completion !== profile.profileCompletion)
      await this.db.businessProfile.update({
        where: { id: profile.id },
        data: { profileCompletion: completion },
      });
    return {
      ...profile,
      businessName: profile.name,
      countryCode: profile.country,
      profileCompletion: completion,
    };
  }
  async updateBusiness(userId: string, dto: BusinessProfileDto) {
    const profile = await this.ownerBusiness(userId);
    const slug = dto.slug
      ? await this.uniqueSlug("business", dto.slug, profile.id)
      : profile.slug;
    if (
      dto.industryId &&
      !(await this.db.industry.findFirst({
        where: { id: dto.industryId, active: true },
      }))
    )
      this.error(
        HttpStatus.BAD_REQUEST,
        "INVALID_INDUSTRY",
        "Select an active Rivera industry.",
      );
    await this.db.businessProfile.update({
      where: { id: profile.id },
      data: {
        name: dto.businessName?.trim(),
        slug,
        shortDescription: dto.shortDescription?.trim(),
        description: dto.description?.trim(),
        industryId: dto.industryId,
        website: dto.website || undefined,
        businessEmail: dto.businessEmail?.trim(),
        businessPhone: dto.businessPhone?.trim(),
          preferredContactMethod: dto.preferredContactMethod,
        country: dto.countryCode?.toUpperCase(),
        city: dto.city?.trim(),
        address: dto.address?.trim(),
        yearEstablished: dto.yearEstablished,
        employeeSize: dto.employeeSize,
        profileVisibility: dto.profileVisibility,
      },
    });
    const updated = await this.ownerBusiness(userId);
    await this.db.businessProfile.update({
      where: { id: profile.id },
      data: { profileCompletion: this.businessCompletion(updated) },
    });
    return this.businessOwner(userId);
  }
  async publishBusiness(userId: string) {
    const profile = await this.ownerBusiness(userId);
    const missing: string[] = [];
    if (!profile.name) missing.push("business name");
    if (!profile.description) missing.push("description");
    if (!profile.industryId) missing.push("industry");
    if (!profile.country || !profile.city) missing.push("location");
    if (missing.length)
      this.error(
        HttpStatus.BAD_REQUEST,
        "PROFILE_INCOMPLETE",
        `Before publishing, add: ${missing.join(", ")}.`,
      );
    await this.db.businessProfile.update({
      where: { id: profile.id },
      data: {
        profileVisibility: "PUBLIC",
        publishedAt: profile.publishedAt ?? new Date(),
        profileCompletion: this.businessCompletion(profile),
      },
    });
    return this.businessOwner(userId);
  }
  async unpublishBusiness(userId: string) {
    const profile = await this.ownerBusiness(userId);
    await this.db.businessProfile.update({
      where: { id: profile.id },
      data: { profileVisibility: "PRIVATE", publishedAt: null },
    });
    return { profileVisibility: "PRIVATE" };
  }
  async businessPublic(slug: string) {
    const profile = await this.db.businessProfile.findUnique({
      where: { slug },
      include: { industryRef: true },
    });
    if (
      !profile ||
      !profile.publishedAt ||
      !["PUBLIC", "UNLISTED"].includes(profile.profileVisibility)
    )
      this.error(
        HttpStatus.NOT_FOUND,
        "BUSINESS_PROFILE_NOT_FOUND",
        "Business profile not found.",
      );
    return {
      slug: profile.slug,
      businessName: profile.name,
      shortDescription: profile.shortDescription,
      description: profile.description,
      industry: profile.industryRef,
      website: profile.website,
      countryCode: profile.country,
      city: profile.city,
      logoUrl: profile.logoUrl,
      coverImageUrl: profile.coverImageUrl,
      yearEstablished: profile.yearEstablished,
      employeeSize: profile.employeeSize,
      verificationStatus: profile.verificationStatus,
    };
  }

  categories() {
    return this.db.category.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  }
  industries() {
    return this.db.industry.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  }
  contentTypes() {
    return this.db.contentType.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  }
  adminTaxonomy(kind: "category" | "industry" | "contentType") {
    if (kind === "category")
      return this.db.category.findMany({
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      });
    if (kind === "industry")
      return this.db.industry.findMany({
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      });
    return this.db.contentType.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  }
  async taxonomy(
    kind: "category" | "industry" | "contentType",
    dto: TaxonomyDto,
    id?: string,
  ) {
    const slug = slugBase(dto.name);
    const data = {
      name: dto.name.trim(),
      slug,
      active: dto.active ?? true,
      sortOrder: dto.sortOrder ?? 0,
      ...(kind === "category"
        ? { description: dto.description, icon: dto.icon }
        : {}),
    };
    try {
      if (kind === "category")
        return id
          ? this.db.category.update({ where: { id }, data })
          : this.db.category.create({ data });
      if (kind === "industry")
        return id
          ? this.db.industry.update({ where: { id }, data })
          : this.db.industry.create({ data });
      return id
        ? this.db.contentType.update({ where: { id }, data })
        : this.db.contentType.create({ data });
    } catch {
      this.error(
        HttpStatus.CONFLICT,
        "TAXONOMY_SLUG_EXISTS",
        "A record with this name or URL already exists.",
      );
    }
  }

  async requestVerification(userId: string, dto: VerificationRequestDto) {
    const existing = await this.db.verificationRequest.findFirst({
      where: { userId, profileType: dto.profileType, status: "PENDING" },
    });
    if (existing)
      this.error(
        HttpStatus.CONFLICT,
        "VERIFICATION_ALREADY_PENDING",
        "You already have a pending verification request.",
      );
    const creator =
      dto.profileType === "CREATOR" ? await this.ownerCreator(userId) : null;
    const business =
      dto.profileType === "BUSINESS" ? await this.ownerBusiness(userId) : null;
    if (
      (creator?.verificationStatus ?? business?.verificationStatus) ===
      "VERIFIED"
    )
      this.error(
        HttpStatus.CONFLICT,
        "PROFILE_ALREADY_VERIFIED",
        "This profile is already verified.",
      );
    return this.db.$transaction(async (tx) => {
      if (creator)
        await tx.creatorProfile.update({
          where: { id: creator.id },
          data: { verificationStatus: "PENDING" },
        });
      if (business)
        await tx.businessProfile.update({
          where: { id: business.id },
          data: { verificationStatus: "PENDING" },
        });
      return tx.verificationRequest.create({
        data: {
          userId,
          profileType: dto.profileType,
          creatorProfileId: creator?.id,
          businessProfileId: business?.id,
          noteFromUser: dto.noteFromUser,
        },
      });
    });
  }
  myVerifications(userId: string) {
    return this.db.verificationRequest.findMany({
      where: { userId },
      select: {
        id: true,
        profileType: true,
        status: true,
        noteFromUser: true,
        createdAt: true,
        reviewedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }
  adminVerifications() {
    return this.db.verificationRequest.findMany({
      include: {
        user: { select: { firstName: true, lastName: true } },
        creatorProfile: { select: { id: true, slug: true, displayName: true } },
        businessProfile: { select: { id: true, slug: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }
  async reviewVerification(
    adminId: string,
    id: string,
    approved: boolean,
    dto: VerificationReviewDto,
  ) {
    const request = await this.db.verificationRequest.findUnique({
      where: { id },
    });
    if (!request || request.status !== "PENDING")
      this.error(
        HttpStatus.NOT_FOUND,
        "PENDING_VERIFICATION_NOT_FOUND",
        "Pending verification request not found.",
      );
    const status = approved ? "APPROVED" : "REJECTED";
    const verificationStatus = approved ? "VERIFIED" : "REJECTED";
    return this.db.$transaction(async (tx) => {
      if (request.creatorProfileId)
        await tx.creatorProfile.update({
          where: { id: request.creatorProfileId },
          data: { verificationStatus },
        });
      if (request.businessProfileId)
        await tx.businessProfile.update({
          where: { id: request.businessProfileId },
          data: { verificationStatus },
        });
      return tx.verificationRequest.update({
        where: { id },
        data: {
          status,
          reviewNote: dto.reviewNote,
          reviewedById: adminId,
          reviewedAt: new Date(),
        },
      });
    });
  }
  adminCreators(q?: string) {
    return this.db.creatorProfile.findMany({
      where: q
        ? {
            OR: [
              { displayName: { contains: q, mode: "insensitive" } },
              { slug: { contains: q, mode: "insensitive" } },
            ],
          }
        : {},
      include: {
        user: { select: { status: true, createdAt: true } },
        _count: { select: { socialAccounts: true, portfolio: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }
  adminBusinesses(q?: string) {
    return this.db.businessProfile.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { slug: { contains: q, mode: "insensitive" } },
            ],
          }
        : {},
      include: {
        industryRef: true,
        user: { select: { status: true, createdAt: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }
  async adminCreator(id: string) {
    const profile = await this.db.creatorProfile.findUnique({
      where: { id },
      include: {
        ...creatorInclude,
        user: { select: { status: true, createdAt: true } },
        verificationRequests: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!profile)
      this.error(
        HttpStatus.NOT_FOUND,
        "CREATOR_PROFILE_NOT_FOUND",
        "Creator profile not found.",
      );
    return profile;
  }
  async adminBusiness(id: string) {
    const profile = await this.db.businessProfile.findUnique({
      where: { id },
      include: {
        industryRef: true,
        user: { select: { status: true, createdAt: true } },
        verificationRequests: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!profile)
      this.error(
        HttpStatus.NOT_FOUND,
        "BUSINESS_PROFILE_NOT_FOUND",
        "Business profile not found.",
      );
    return profile;
  }
  async moderateProfile(
    kind: "creator" | "business",
    id: string,
    dto: AdminModerationDto,
  ) {
    if (kind === "creator") {
      if (!(await this.db.creatorProfile.findUnique({ where: { id } })))
        this.error(
          HttpStatus.NOT_FOUND,
          "CREATOR_PROFILE_NOT_FOUND",
          "Creator profile not found.",
        );
      return this.db.creatorProfile.update({ where: { id }, data: dto });
    }
    if (!(await this.db.businessProfile.findUnique({ where: { id } })))
      this.error(
        HttpStatus.NOT_FOUND,
        "BUSINESS_PROFILE_NOT_FOUND",
        "Business profile not found.",
      );
    return this.db.businessProfile.update({ where: { id }, data: dto });
  }
  async verifySocial(id: string, verified: boolean) {
    if (!(await this.db.creatorSocialAccount.findUnique({ where: { id } })))
      this.error(
        HttpStatus.NOT_FOUND,
        "SOCIAL_ACCOUNT_NOT_FOUND",
        "Social account not found.",
      );
    return this.db.creatorSocialAccount.update({
      where: { id },
      data: { verifiedByRivera: verified },
    });
  }
  async setMedia(
    userId: string,
    role: VerificationProfileType,
    field: "profileImageUrl" | "logoUrl" | "coverImageUrl",
    url: string,
  ) {
    if (role === "CREATOR") {
      const profile = await this.ownerCreator(userId);
      if (field === "logoUrl")
        this.error(
          HttpStatus.BAD_REQUEST,
          "INVALID_MEDIA_TARGET",
          "Creators do not have a business logo.",
        );
      return this.db.creatorProfile.update({
        where: { id: profile.id },
        data: { [field]: url },
      });
    }
    const profile = await this.ownerBusiness(userId);
    if (field === "profileImageUrl")
      this.error(
        HttpStatus.BAD_REQUEST,
        "INVALID_MEDIA_TARGET",
        "Businesses use a logo.",
      );
    return this.db.businessProfile.update({
      where: { id: profile.id },
      data: { [field]: url },
    });
  }
}
