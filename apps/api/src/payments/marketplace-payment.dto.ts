import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  MinLength,
} from "class-validator";
import { PaymentIssueStatus, PaymentIssueType } from "@prisma/client";

export class OpenPaymentIssueDto {
  @IsString() participantId!: string;
  @IsEnum(PaymentIssueType) type!: PaymentIssueType;
  @IsString() @MinLength(20) @Length(20, 2000) description!: string;
}
export class RefundCollaborationDto {
  @IsInt() @Min(1) amountMinor!: number;
  @IsString() @MinLength(10) @Length(10, 500) reason!: string;
}
export class ResolvePaymentIssueDto {
  @IsEnum(PaymentIssueStatus) status!: PaymentIssueStatus;
  @IsString() @MinLength(5) @Length(5, 2000) adminNote!: string;
}
export class FeeSettingsDto {
  @IsInt() @Min(0) @Max(10000) basisPoints!: number;
  @IsInt() @Min(0) fixedMinor!: number;
  @IsOptional()
  @IsIn(["BUSINESS_PAYS_ON_TOP", "DEDUCT_FROM_CREATOR"])
  policy?: "BUSINESS_PAYS_ON_TOP" | "DEDUCT_FROM_CREATOR";
}
