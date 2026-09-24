import { IsEmail, IsEnum, IsNotEmpty, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
export class RegisterDto {
  @ApiProperty() @IsString() @Length(1, 80) firstName!: string;
  @ApiProperty() @IsString() @Length(1, 80) lastName!: string;
  @ApiProperty({ format: 'email' }) @IsEmail() email!: string;
  @ApiProperty({ minLength: 12, writeOnly: true }) @IsString() @Length(12, 128) password!: string;
  @ApiProperty({ enum: ['BUSINESS','CREATOR'] }) @IsEnum(UserRole) accountType!: UserRole;
}
export class LoginDto { @ApiProperty({format:'email'}) @IsEmail() email!: string; @ApiProperty({writeOnly:true}) @IsString() password!: string; }
export class EmailDto { @ApiProperty({format:'email'}) @IsEmail() email!: string; }
export class TokenDto { @ApiProperty({description:'Token from the emailed link',writeOnly:true}) @IsString() @IsNotEmpty() token!: string; }
export class ResetDto extends TokenDto { @ApiProperty({minLength:12,writeOnly:true}) @IsString() @Length(12, 128) password!: string; }
export class ChangePasswordDto { @ApiProperty({writeOnly:true}) @IsString() currentPassword!: string; @ApiProperty({minLength:12,writeOnly:true}) @IsString() @Length(12, 128) newPassword!: string; }
