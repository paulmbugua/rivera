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
  Matches,
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
  @IsIn(["BUSINESS_PAYS_ON_TOP"])
  policy?: "BUSINESS_PAYS_ON_TOP";
}

export class PayoutAccountOnboardDto {
  @IsOptional()
  @IsString()
  @Matches(/^(?:\+?254|0)(?:1|7)\d{8}$/, {
    message: "Enter a valid Kenyan M-Pesa number.",
  })
  phoneNumber?: string;
}
