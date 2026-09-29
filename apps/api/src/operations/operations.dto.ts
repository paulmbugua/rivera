import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Length,
} from "class-validator";
import {
  DataLifecycleRequestStatus,
  DataLifecycleRequestType,
  NotificationCategory,
  SafetyReportStatus,
  SafetyReportType,
  UserStatus,
} from "@prisma/client";

export class PreferenceDto {
  @IsEnum(NotificationCategory) category!: NotificationCategory;
  @IsBoolean() emailEnabled!: boolean;
  @IsBoolean() inAppEnabled!: boolean;
}
export class CreateSafetyReportDto {
  @IsEnum(SafetyReportType) type!: SafetyReportType;
  @IsString() subjectId!: string;
  @IsString() @Length(20, 1000) reason!: string;
}
export class ModerateSafetyReportDto {
  @IsEnum(SafetyReportStatus) status!: SafetyReportStatus;
  @IsOptional() @IsString() @Length(5, 2000) privateAdminNote?: string;
}
export class CreateDataRequestDto {
  @IsEnum(DataLifecycleRequestType) type!: DataLifecycleRequestType;
}
export class UpdateDataRequestDto {
  @IsEnum(DataLifecycleRequestStatus) status!: DataLifecycleRequestStatus;
  @IsOptional() @IsString() @Length(5, 2000) privateNote?: string;
}
export class ModerateUserDto {
  @IsEnum(UserStatus) status!: UserStatus;
  @IsString() @Length(5, 500) reason!: string;
}
