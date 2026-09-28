import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsISO8601, IsOptional, IsString, Length, Matches, Max, MaxLength, Min } from 'class-validator';
import { ApplicationStatus, PaymentRefundReason } from '@prisma/client';

const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;

export class ProposalDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(1_000_000_000) proposedAmountMinor!: number;
  @Transform(trim) @Matches(/^[A-Za-z]{3}$/) proposedCurrencyCode!: string;
  @Transform(trim) @IsString() @Length(40, 1500) pitch!: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(3000) proposedDeliverables?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(365) estimatedDeliveryDays?: number;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(1500) additionalNotes?: string;
}

export class ApplicationQueryDto {
  @IsOptional() @IsEnum(ApplicationStatus) status?: ApplicationStatus;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit = 20;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() platform?: string;
  @IsOptional() @Transform(({value})=>value==='true'||value===true) @IsBoolean() verified?: boolean;
  @IsOptional() @IsString() sort = 'newest';
}

export class FeeRuleDto {
  @Transform(trim) @IsString() @Length(2, 120) name!: string;
  @IsOptional() @Transform(({value})=>typeof value==='string'&&value?value.trim().toUpperCase():undefined) @Matches(/^[A-Z]{2}$/) countryCode?: string;
  @IsOptional() @IsString() categoryId?: string;
  @Type(() => Number) @IsInt() @Min(0) @Max(10_000_000) amountMinor!: number;
  @Transform(({value})=>String(value).toUpperCase()) @Matches(/^[A-Z]{3}$/) currencyCode!: string;
  @Type(() => Number) @IsInt() @Min(-1000) @Max(1000) priority = 0;
  @IsBoolean() active = true;
  @IsOptional() @IsISO8601() startsAt?: string;
  @IsOptional() @IsISO8601() endsAt?: string;
}

export class CreditGrantDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(100) quantity!: number;
  @Transform(trim) @IsString() @Length(3, 240) reason!: string;
}

export class RefundDto {
  @IsEnum(PaymentRefundReason) reason!: PaymentRefundReason;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(500) note?: string;
}
