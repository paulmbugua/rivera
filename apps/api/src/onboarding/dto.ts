import { IsIn, IsOptional, IsString, IsUrl, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
const categories = ['Technology','Fashion','Food','Travel','Beauty','Automotive','Fitness','Gaming','Lifestyle','Other'];
const platforms = ['Instagram','TikTok','YouTube','Facebook','X','LinkedIn','Snapchat','Twitch','Blog','Podcast','Other'];
export class BusinessDto {
  @ApiProperty() @IsString() @Length(2, 120) name!: string;
  @ApiProperty() @IsString() @Length(2, 80) country!: string;
  @ApiProperty() @IsString() @Length(1, 100) city!: string;
  @ApiProperty() @IsString() @Length(2, 100) industry!: string;
  @ApiProperty() @IsString() @Length(10, 500) description!: string;
  @ApiPropertyOptional({format:'uri'}) @IsOptional() @IsUrl({ require_protocol: true }) website?: string;
}
export class CreatorDto {
  @ApiProperty() @IsString() @Length(2, 120) displayName!: string;
  @ApiProperty() @IsString() @Length(2, 80) country!: string;
  @ApiProperty() @IsString() @Length(1, 100) city!: string;
  @ApiProperty({enum:categories}) @IsIn(categories) primaryCategory!: string;
  @ApiProperty({enum:platforms}) @IsIn(platforms) primaryPlatform!: string;
  @ApiProperty() @IsString() @Length(10, 500) bio!: string;
}
