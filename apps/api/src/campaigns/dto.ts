import { Type, Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayUnique, IsArray, IsBoolean, IsDateString, IsEnum, IsISO31661Alpha2, IsInt, IsOptional, IsString, IsUrl, Length, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { BudgetVisibility, CampaignAttachmentVisibility, CampaignLocationType, CampaignObjective, CampaignStatus, CampaignVisibility, SocialPlatform, UsageRights } from '@prisma/client';

const safeUrl = { protocols: ['http', 'https'], require_protocol: true };
const normalizeCountryCode = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toUpperCase() || undefined : value;

export class CampaignLocationDto {
  @Transform(normalizeCountryCode) @IsISO31661Alpha2() countryCode!: string;
  @IsOptional() @IsString() @MaxLength(100) city?: string;
  @IsOptional() @IsString() @MaxLength(100) region?: string;
}

export class CampaignPlatformDto {
  @IsEnum(SocialPlatform) platform!: SocialPlatform;
  @IsOptional() @IsBoolean() required = true;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) minimumFollowers?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) preferredFollowers?: number;
}

export class CampaignLanguageDto {
  @IsString() @Matches(/^[a-z]{2,3}(-[A-Z]{2})?$/) languageCode!: string;
  @IsOptional() @IsBoolean() required = true;
}

export class CampaignDeliverableDto {
  @IsOptional() @IsString() id?: string;
  @IsString() @Length(2, 160) title!: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(1000) quantity = 1;
  @IsOptional() @IsEnum(SocialPlatform) platform?: SocialPlatform;
  @IsOptional() @IsString() contentTypeId?: string;
  @IsOptional() @IsDateString() dueDate?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) sortOrder?: number;
}

export class CampaignDto {
  @IsOptional() @IsString() @Length(2, 160) title?: string;
  @IsOptional() @IsString() @MaxLength(350) shortDescription?: string;
  @IsOptional() @IsString() @MaxLength(5000) fullDescription?: string;
  @IsOptional() @IsString() @MaxLength(160) productOrServiceName?: string;
  @IsOptional() @IsString() @MaxLength(2000) productOrServiceDescription?: string;
  @IsOptional() @IsUrl(safeUrl) productUrl?: string;
  @IsOptional() @IsEnum(CampaignObjective) campaignObjective?: CampaignObjective;
  @IsOptional() @IsString() @MaxLength(160) otherObjective?: string;
  @IsOptional() @IsString() @MaxLength(2000) targetAudience?: string;
  @IsOptional() @IsString() @MaxLength(2000) expectedOutcomes?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) budgetMinMinor?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) budgetMaxMinor?: number;
  @IsOptional() @IsString() @Matches(/^[A-Z]{3}$/) currencyCode?: string;
  @IsOptional() @IsEnum(BudgetVisibility) budgetVisibility?: BudgetVisibility;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10000) creatorSlots?: number;
  @IsOptional() @IsDateString() applicationDeadline?: string;
  @IsOptional() @IsDateString() campaignStartDate?: string;
  @IsOptional() @IsDateString() campaignEndDate?: string;
  @IsOptional() @IsEnum(CampaignLocationType) locationType?: CampaignLocationType;
  @Transform(normalizeCountryCode) @IsOptional() @IsISO31661Alpha2() campaignCountryCode?: string;
  @IsOptional() @IsString() @MaxLength(100) campaignCity?: string;
  @IsOptional() @IsString() @MaxLength(100) campaignRegion?: string;
  @IsOptional() @IsString() @MaxLength(500) physicalLocationDescription?: string;
  @IsOptional() @IsBoolean() verifiedCreatorsOnly?: boolean;
  @IsOptional() @IsEnum(UsageRights) usageRights?: UsageRights;
  @IsOptional() @IsString() @MaxLength(1000) usageRightsNotes?: string;
  @IsOptional() @IsBoolean() productProvided?: boolean;
  @IsOptional() @IsBoolean() travelExpensesCovered?: boolean;
  @IsOptional() @IsString() @MaxLength(2000) specialInstructions?: string;
  @IsOptional() @IsEnum(CampaignVisibility) visibility?: CampaignVisibility;
  @IsOptional() @IsArray() @ArrayMaxSize(5) @ArrayUnique() @IsString({ each: true }) categoryIds?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(20) @ValidateNested({ each: true }) @Type(() => CampaignLocationDto) creatorLocations?: CampaignLocationDto[];
  @IsOptional() @IsArray() @ArrayMaxSize(12) @ValidateNested({ each: true }) @Type(() => CampaignPlatformDto) platforms?: CampaignPlatformDto[];
  @IsOptional() @IsArray() @ArrayMaxSize(10) @ValidateNested({ each: true }) @Type(() => CampaignLanguageDto) languages?: CampaignLanguageDto[];
  @IsOptional() @IsArray() @ArrayMaxSize(20) @ValidateNested({ each: true }) @Type(() => CampaignDeliverableDto) deliverables?: CampaignDeliverableDto[];
}

export class CampaignQueryDto {
  @IsOptional() @IsString() @MaxLength(100) q?: string;
  @Transform(normalizeCountryCode) @IsOptional() @IsISO31661Alpha2() country?: string;
  @IsOptional() @IsString() @MaxLength(100) city?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsEnum(SocialPlatform) platform?: SocialPlatform;
  @IsOptional() @IsEnum(CampaignObjective) objective?: CampaignObjective;
  @IsOptional() @IsEnum(CampaignLocationType) locationType?: CampaignLocationType;
  @IsOptional() @Transform(({ value }) => value === 'true') @IsBoolean() remote?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) budgetMinMinor?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) budgetMaxMinor?: number;
  @IsOptional() @IsString() @Matches(/^[A-Z]{3}$/) currencyCode?: string;
  @IsOptional() @IsDateString() closingBefore?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit = 20;
  @IsOptional() @IsString() @Matches(/^(newest|deadline|budget-high|budget-low)$/) sort: 'newest'|'deadline'|'budget-high'|'budget-low' = 'newest';
}

export class OwnerCampaignQueryDto {
  @IsOptional() @IsEnum(CampaignStatus) status?: CampaignStatus;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit = 20;
}

export class CampaignAdminDto {
  @IsOptional() @IsEnum(CampaignStatus) status?: CampaignStatus;
  @IsOptional() @IsEnum(CampaignVisibility) visibility?: CampaignVisibility;
  @IsOptional() @IsBoolean() isFeatured?: boolean;
}

export class AttachmentDto {
  @IsString() @Length(1, 160) name!: string;
  @IsUrl(safeUrl) fileUrl!: string;
  @IsString() @Matches(/^(application\/pdf|image\/(jpeg|png|webp))$/) mimeType!: string;
  @Type(() => Number) @IsInt() @Min(1) fileSize!: number;
  @IsOptional() @IsEnum(CampaignAttachmentVisibility) visibility?: CampaignAttachmentVisibility;
}
