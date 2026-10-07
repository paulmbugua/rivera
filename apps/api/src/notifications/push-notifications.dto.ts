import { PushPlatform } from "@prisma/client";
import { IsEnum, IsOptional, IsString, Length } from "class-validator";

export class RegisterPushTokenDto {
  @IsString()
  @Length(20, 4096)
  token!: string;

  @IsEnum(PushPlatform)
  platform!: PushPlatform;

  @IsOptional()
  @IsString()
  @Length(1, 160)
  deviceName?: string;
}

export class RemovePushTokenDto {
  @IsString()
  @Length(20, 4096)
  token!: string;
}
