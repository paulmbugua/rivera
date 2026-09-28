import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsEnum, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';

export class SubmissionLinkDto {
  @IsString() @MinLength(1) @MaxLength(240) name!: string;
  @IsString() @MaxLength(2000) @Matches(/^https:\/\//i, { message: 'url must use HTTPS' }) url!: string;
}

export class CreateSubmissionDto {
  @IsOptional() @IsString() @MaxLength(2000) message?: string;
  @IsArray() @ArrayMaxSize(10) @ValidateNested({ each: true }) @Type(() => SubmissionLinkDto)
  links: SubmissionLinkDto[] = [];
}

export class FileSubmissionDto {
  @IsOptional() @IsString() @MaxLength(2000) message?: string;
}

export class RevisionRequestDto {
  @IsString() @MinLength(10) @MaxLength(2000) note!: string;
}

export class CreateReviewDto {
  @IsString() participantId!: string;
  @IsInt() @Min(1) @Max(5) rating!: number;
  @IsOptional() @IsString() @MaxLength(2000) comment?: string;
}

export class ReportReviewDto {
  @IsString() @MinLength(10) @MaxLength(1000) reason!: string;
}

export enum ReviewModerationAction { HIDE='HIDE', RESTORE='RESTORE', REMOVE='REMOVE' }
export class ModerateReviewDto { @IsEnum(ReviewModerationAction) action!: ReviewModerationAction; }
