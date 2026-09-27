import { Controller, HttpStatus, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthGuard, Roles } from '../auth/guard';
import { ApiException } from '../common/api-error';
import { MarketplaceService } from '../marketplace/marketplace.service';
import { LocalStorageService } from './storage.service';

const imageBody = { schema: { type: 'object', required: ['file'], properties: { file: { type: 'string', format: 'binary' } } } };
const upload = (maxMb: number) => FileInterceptor('file', { limits: { fileSize: maxMb * 1024 * 1024, files: 1 } });

@ApiTags('Uploads')
@ApiCookieAuth('access-cookie')
@UseGuards(AuthGuard)
@Controller('uploads')
export class UploadsController {
  constructor(private storage: LocalStorageService, private marketplace: MarketplaceService) {}
  private required(file?: { buffer: Buffer; mimetype: string; size: number }) { if (!file) throw new ApiException(HttpStatus.BAD_REQUEST, 'IMAGE_REQUIRED', 'Choose an image to upload.'); return file; }
  @Roles('CREATOR') @Post('profile-image') @UseInterceptors(upload(Number(process.env.MAX_PROFILE_IMAGE_MB ?? 5))) @ApiConsumes('multipart/form-data') @ApiBody(imageBody)
  async profile(@CurrentUser() user: { id: string }, @UploadedFile() file?: { buffer: Buffer; mimetype: string; size: number }) { const saved = await this.storage.upload(user.id, 'profile', this.required(file)); await this.marketplace.setMedia(user.id, 'CREATOR', 'profileImageUrl', saved.url); return saved; }
  @Roles('BUSINESS') @Post('logo') @UseInterceptors(upload(Number(process.env.MAX_PROFILE_IMAGE_MB ?? 5))) @ApiConsumes('multipart/form-data') @ApiBody(imageBody)
  async logo(@CurrentUser() user: { id: string }, @UploadedFile() file?: { buffer: Buffer; mimetype: string; size: number }) { const saved = await this.storage.upload(user.id, 'logo', this.required(file)); await this.marketplace.setMedia(user.id, 'BUSINESS', 'logoUrl', saved.url); return saved; }
  @Roles('CREATOR','BUSINESS') @Post('cover-image') @UseInterceptors(upload(Number(process.env.MAX_COVER_IMAGE_MB ?? 10))) @ApiConsumes('multipart/form-data') @ApiBody(imageBody)
  async cover(@CurrentUser() user: { id: string; roles: string[] }, @UploadedFile() file?: { buffer: Buffer; mimetype: string; size: number }) { const role = user.roles.includes('CREATOR') ? 'CREATOR' : 'BUSINESS'; const saved = await this.storage.upload(user.id, 'cover', this.required(file)); await this.marketplace.setMedia(user.id, role, 'coverImageUrl', saved.url); return saved; }
  @Roles('CREATOR') @Post('portfolio') @UseInterceptors(upload(Number(process.env.MAX_PORTFOLIO_IMAGE_MB ?? 10))) @ApiConsumes('multipart/form-data') @ApiBody(imageBody)
  portfolio(@CurrentUser() user: { id: string }, @UploadedFile() file?: { buffer: Buffer; mimetype: string; size: number }) { return this.storage.upload(user.id, 'portfolio', this.required(file)); }
}

