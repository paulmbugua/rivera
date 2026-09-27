import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, ArrayUnique, IsArray, IsBoolean, IsEnum, IsIn, IsISO31661Alpha2, IsInt, IsNumber, IsOptional, IsString, IsUrl, Length, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { EmployeeSize, LanguageProficiency, PortfolioMediaType, ProfileVisibility, SocialPlatform, VerificationProfileType } from '@prisma/client';

const safeUrl = { protocols: ['http', 'https'], require_protocol: true };

export class LanguageDto {
  @IsString() @Matches(/^[a-z]{2,3}(-[A-Z]{2})?$/) languageCode!: string;
  @IsOptional() @IsEnum(LanguageProficiency) proficiency?: LanguageProficiency;
}

export class CreatorProfileDto {
  @IsOptional() @IsString() @Length(2, 120) displayName?: string;
  @IsOptional() @IsString() @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) @MaxLength(80) slug?: string;
  @IsOptional() @IsString() @MaxLength(120) headline?: string;
  @IsOptional() @IsString() @MaxLength(2000) bio?: string;
  @IsOptional() @IsISO31661Alpha2() countryCode?: string;
  @IsOptional() @IsString() @MaxLength(100) city?: string;
  @IsOptional() @IsUrl(safeUrl) websiteUrl?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(80) yearsExperience?: number;
  @IsOptional() @IsBoolean() travelAvailable?: boolean;
  @IsOptional() @IsBoolean() remoteCampaignsAllowed?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) minimumRateMinor?: number;
  @IsOptional() @IsString() @Matches(/^[A-Z]{3}$/) minimumRateCurrency?: string;
  @IsOptional() @IsEnum(ProfileVisibility) profileVisibility?: ProfileVisibility;
  @IsOptional() @IsArray() @ArrayMaxSize(5) @ArrayUnique() @IsString({ each: true }) categoryIds?: string[];
  @IsOptional() @IsString() primaryCategoryId?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(12) @ArrayUnique() @IsString({ each: true }) contentTypeIds?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(10) @ValidateNested({ each: true }) @Type(() => LanguageDto) languages?: LanguageDto[];
}

export class BusinessProfileDto {
  @IsOptional() @IsString() @Length(2, 120) businessName?: string;
  @IsOptional() @IsString() @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) @MaxLength(80) slug?: string;
  @IsOptional() @IsString() @MaxLength(240) shortDescription?: string;
  @IsOptional() @IsString() @MaxLength(3000) description?: string;
  @IsOptional() @IsString() industryId?: string;
  @IsOptional() @IsUrl(safeUrl) website?: string;
  @IsOptional() @IsString() @MaxLength(254) businessEmail?: string;
  @IsOptional() @IsString() @MaxLength(30) businessPhone?: string;
  @IsOptional() @IsISO31661Alpha2() countryCode?: string;
  @IsOptional() @IsString() @MaxLength(100) city?: string;
  @IsOptional() @IsString() @MaxLength(300) address?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1800) @Max(new Date().getFullYear()) yearEstablished?: number;
  @IsOptional() @IsEnum(EmployeeSize) employeeSize?: EmployeeSize;
  @IsOptional() @IsEnum(ProfileVisibility) profileVisibility?: ProfileVisibility;
}

export class SocialAccountDto {
  @IsEnum(SocialPlatform) platform!: SocialPlatform;
  @IsOptional() @IsString() @Length(1, 100) username?: string;
  @IsOptional() @IsUrl(safeUrl) profileUrl?: string;
  @Type(() => Number) @IsInt() @Min(0) followers = 0;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) averageViews?: number;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(100) engagementRate?: number;
  @IsOptional() @IsBoolean() isPrimary?: boolean;
}

export class PortfolioDto {
  @IsString() @Length(2, 140) title!: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsEnum(PortfolioMediaType) mediaType!: PortfolioMediaType;
  @IsOptional() @IsUrl(safeUrl) mediaUrl?: string;
  @IsOptional() @IsUrl(safeUrl) thumbnailUrl?: string;
  @IsOptional() @IsUrl(safeUrl) externalUrl?: string;
  @IsOptional() @IsEnum(SocialPlatform) platform?: SocialPlatform;
  @IsOptional() @IsString() @MaxLength(120) brandName?: string;
  @IsOptional() @IsBoolean() published?: boolean;
}

export class ReorderPortfolioDto {
  @IsArray() @ArrayMaxSize(20) @ArrayUnique() @IsString({ each: true }) ids!: string[];
}

export class DirectoryQueryDto {
  @IsOptional() @IsString() @MaxLength(100) q?: string;
  @IsOptional() @IsISO31661Alpha2() country?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsEnum(SocialPlatform) platform?: SocialPlatform;
  @IsOptional() @Transform(({ value }) => value === 'true') @IsBoolean() verified?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit = 20;
  @IsOptional() @IsIn(['newest', 'name', 'followers']) sort: 'newest' | 'name' | 'followers' = 'newest';
}

export class VerificationRequestDto {
  @IsEnum(VerificationProfileType) profileType!: VerificationProfileType;
  @IsOptional() @IsString() @MaxLength(1000) noteFromUser?: string;
}

export class VerificationReviewDto { @IsOptional() @IsString() @MaxLength(1000) reviewNote?: string; }

export class TaxonomyDto {
  @IsString() @Length(2, 80) name!: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsString() @MaxLength(50) icon?: string;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) sortOrder?: number;
}

export class AdminModerationDto {
  @IsOptional() @IsEnum(ProfileVisibility) profileVisibility?: ProfileVisibility;
  @IsOptional() @IsBoolean() isFeatured?: boolean;
}

export class SocialVerificationDto { @IsBoolean() verified!: boolean; }
