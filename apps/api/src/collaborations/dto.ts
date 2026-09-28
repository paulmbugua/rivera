import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Length, Max, MaxLength, Min, MinLength } from 'class-validator';

export enum RejectionReason { BUDGET_MISMATCH='BUDGET_MISMATCH', CREATOR_REQUIREMENTS='CREATOR_REQUIREMENTS', OTHER_CREATOR_SELECTED='OTHER_CREATOR_SELECTED', CAMPAIGN_CHANGED='CAMPAIGN_CHANGED', OTHER='OTHER' }
export class RejectApplicationDto { @IsEnum(RejectionReason) reason!:RejectionReason; @IsOptional() @IsString() @MaxLength(500) note?:string; }
export class MessageDto { @IsString() @MinLength(1) @MaxLength(3000) content!:string; }
export class MessageQueryDto { @IsOptional() @IsString() cursor?:string; @IsOptional() @IsInt() @Min(1) @Max(100) limit=30; }
export class OfferDto {
  @IsInt() @Min(0) compensationMinor!:number;
  @IsString() @Length(3,3) currencyCode!:string;
  @IsString() @MinLength(3) @MaxLength(3000) deliverablesSummary!:string;
  @IsOptional() @IsDateString() startDate?:string;
  @IsOptional() @IsDateString() endDate?:string;
  @IsOptional() @IsDateString() deliveryDeadline?:string;
  @IsOptional() @IsString() @MaxLength(1000) usageRights?:string;
  @IsOptional() @IsString() @MaxLength(3000) additionalTerms?:string;
  @IsOptional() @IsDateString() expiresAt?:string;
}
