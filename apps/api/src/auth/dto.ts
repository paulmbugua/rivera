import { Equals, IsEmail, IsEnum, IsISO31661Alpha2, IsNotEmpty, IsOptional, IsString, IsUrl, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
export class RegisterDto {
  @ApiProperty() @IsString() @Length(1, 80) firstName!: string;
  @ApiProperty() @IsString() @Length(1, 80) lastName!: string;
  @ApiProperty({ format: 'email' }) @IsEmail() email!: string;
  @ApiProperty({ minLength: 8, writeOnly: true, example: 'StrongPassword123' }) @IsString() @Length(8, 128) @Matches(/[a-z]/, { message: 'Password must include a lowercase letter' }) @Matches(/[A-Z]/, { message: 'Password must include an uppercase letter' }) @Matches(/\d/, { message: 'Password must include a number' }) password!: string;
  @ApiProperty({ enum: ['BUSINESS','CREATOR'] }) @IsEnum(UserRole) accountType!: UserRole;
  @ApiProperty({ example: true }) @Equals(true, { message: 'You must agree to the Terms of Service and Privacy Policy' }) termsAccepted!: boolean;
}
export class GoogleRegisterDto {
  @ApiProperty({ writeOnly: true }) @IsString() @IsNotEmpty() token!: string;
  @ApiProperty() @IsString() @Length(1, 80) firstName!: string;
  @ApiProperty() @IsString() @Length(1, 80) lastName!: string;
  @ApiProperty({ enum: ['BUSINESS','CREATOR'] }) @IsEnum(UserRole) accountType!: UserRole;
  @ApiProperty({ example: true }) @Equals(true, { message: 'You must agree to the Terms of Service and Privacy Policy' }) termsAccepted!: boolean;
}
export class FirebaseGoogleDto { @ApiProperty({ writeOnly: true }) @IsString() @IsNotEmpty() idToken!: string; }
export class LoginDto { @ApiProperty({format:'email'}) @IsEmail() email!: string; @ApiProperty({writeOnly:true}) @IsString() password!: string; }
export class EmailDto { @ApiProperty({format:'email'}) @IsEmail() email!: string; }
export class TokenDto { @ApiProperty({description:'Token from the emailed link',writeOnly:true}) @IsString() @IsNotEmpty() token!: string; }
export class ResetDto extends TokenDto { @ApiProperty({minLength:8,writeOnly:true}) @IsString() @Length(8, 128) @Matches(/[a-z]/) @Matches(/[A-Z]/) @Matches(/\d/) password!: string; }
export class ChangePasswordDto {
  @ApiProperty({writeOnly:true}) @IsString() currentPassword!: string;
  @ApiProperty({minLength:8,writeOnly:true}) @IsString() @Length(8, 128) @Matches(/[a-z]/) @Matches(/[A-Z]/) @Matches(/\d/) newPassword!: string;
  @ApiProperty({minLength:8,writeOnly:true}) @IsString() confirmPassword!: string;
}
export class UpdateProfileDto {
  @ApiProperty() @IsString() @Length(1, 80) firstName!: string;
  @ApiProperty() @IsString() @Length(1, 80) lastName!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @Length(5, 30) phone?: string;
  @ApiProperty({ required: false, example: 'KE' }) @IsOptional() @IsISO31661Alpha2() countryCode?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @Length(1, 100) city?: string;
  @ApiProperty({ required: false, format: 'uri' }) @IsOptional() @IsUrl({ require_protocol: true }) profileImageUrl?: string;
}
