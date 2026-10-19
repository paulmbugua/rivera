import { Transform } from 'class-transformer';
import { Equals, IsBoolean, IsEmail, IsInt, IsString, Length, Matches, Min } from 'class-validator';
const trim = ({value}: {value: unknown}) => typeof value === 'string' ? value.trim() : value;
export class WiseAccountDto {
  @Transform(({value})=>typeof value === 'string' ? value.trim().toLowerCase() : value) @IsEmail() @Length(3,254) email!: string;
  @Transform(trim) @IsString() @Length(3,160) legalName!: string;
  @IsBoolean() @Equals(true) ownsAccount!: boolean;
}
export class WiseVerifyDto {
  @Transform(trim) @IsString() @Matches(/^\d{8}$/) code!: string;
}
export class WiseApproveDto {
  @IsBoolean() @Equals(true) recipientSupported!: boolean;
  @Transform(trim) @IsString() @Length(10,500) reviewNote!: string;
}
export class WiseCompleteDto {
  @Transform(trim) @IsString() @Matches(/^[1-9]\d{4,29}$/) reference!: string;
  @Transform(({value})=>typeof value === 'string' ? value.trim().toLowerCase() : value) @IsEmail() email!: string;
  @IsInt() @Min(1) amountUsdMinor!: number;
  @IsBoolean() @Equals(true) confirmedCompleted!: boolean;
}
