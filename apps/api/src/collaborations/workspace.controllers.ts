import { Body, Controller, Get, Param, Patch, Post, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthGuard, AuthUser, Roles } from '../auth/guard';
import { CreateReviewDto, CreateSubmissionDto, FileSubmissionDto, ModerateReviewDto, ReportReviewDto, RevisionRequestDto } from './workspace.dto';
import { WorkspaceService } from './workspace.service';

const fileUpload=FileInterceptor('file',{limits:{files:1,fileSize:Number(process.env.MAX_DELIVERABLE_FILE_MB??25)*1024*1024}});

@ApiTags('Creator workspaces') @ApiCookieAuth('access-cookie') @UseGuards(AuthGuard) @Roles('CREATOR') @Controller('creators/me')
export class CreatorWorkspaceController { constructor(private service:WorkspaceService){}
  @Get('collaborations/:id/work-items') @ApiOperation({summary:'Get the Creator collaboration workspace, progress and version history'}) workspace(@CurrentUser()u:AuthUser,@Param('id')id:string){return this.service.workspace(u.id,id);}
  @Post('work-items/:id/submissions') @ApiResponse({status:201,description:'A new immutable HTTPS-link submission version.'}) submit(@CurrentUser()u:AuthUser,@Param('id')id:string,@Body()dto:CreateSubmissionDto){return this.service.submitLinks(u.id,id,dto);}
  @Get('work-items/:id/submissions') history(@CurrentUser()u:AuthUser,@Param('id')id:string){return this.service.history(u.id,id);}
  @Post('work-items/:id/submissions/file') @UseInterceptors(fileUpload) @ApiConsumes('multipart/form-data') @ApiBody({schema:{type:'object',required:['file'],properties:{message:{type:'string'},file:{type:'string',format:'binary'}}}})
  submitFile(@CurrentUser()u:AuthUser,@Param('id')id:string,@Body()dto:FileSubmissionDto,@UploadedFile()file?:{buffer:Buffer;mimetype:string;size:number;originalname:string}){return this.service.submitFile(u.id,id,dto.message,file);}
  @Get('workspace-summary') summary(@CurrentUser()u:AuthUser){return this.service.summary(u.id,'CREATOR');}
}

@ApiTags('Business workspaces') @ApiCookieAuth('access-cookie') @UseGuards(AuthGuard) @Roles('BUSINESS') @Controller('business')
export class BusinessWorkspaceController { constructor(private service:WorkspaceService){}
  @Get('campaign-participants/:id/work-items') workspace(@CurrentUser()u:AuthUser,@Param('id')id:string){return this.service.workspace(u.id,id);}
  @Get('work-items/:id/submissions') history(@CurrentUser()u:AuthUser,@Param('id')id:string){return this.service.history(u.id,id);}
  @Post('submissions/:id/approve') @ApiResponse({status:201,description:'Latest submission approved.'}) approve(@CurrentUser()u:AuthUser,@Param('id')id:string){return this.service.approve(u.id,id);}
  @Post('submissions/:id/request-revision') revision(@CurrentUser()u:AuthUser,@Param('id')id:string,@Body()dto:RevisionRequestDto){return this.service.requestRevision(u.id,id,dto);}
  @Post('campaign-participants/:id/complete') complete(@CurrentUser()u:AuthUser,@Param('id')id:string){return this.service.completeParticipant(u.id,id);}
  @Post('campaigns/:id/complete') completeCampaign(@CurrentUser()u:AuthUser,@Param('id')id:string){return this.service.completeCampaign(u.id,id);}
  @Get('workspace-summary') summary(@CurrentUser()u:AuthUser){return this.service.summary(u.id,'BUSINESS');}
}

@ApiTags('Reviews') @Controller()
export class ReviewsController { constructor(private service:WorkspaceService){}
  @Get('creators/:slug/reviews') creator(@Param('slug')slug:string){return this.service.publicReviews('creator',slug);}
  @Get('businesses/:slug/reviews') business(@Param('slug')slug:string){return this.service.publicReviews('business',slug);}
  @UseGuards(AuthGuard) @Roles('CREATOR','BUSINESS') @ApiCookieAuth('access-cookie') @Post('reviews') create(@CurrentUser()u:AuthUser,@Body()dto:CreateReviewDto){return this.service.createReview(u.id,dto);}
  @UseGuards(AuthGuard) @Roles('CREATOR','BUSINESS','ADMIN') @ApiCookieAuth('access-cookie') @Post('reviews/:id/report') report(@CurrentUser()u:AuthUser,@Param('id')id:string,@Body()dto:ReportReviewDto){return this.service.report(u.id,id,dto);}
  @UseGuards(AuthGuard) @Roles('CREATOR','BUSINESS') @ApiCookieAuth('access-cookie') @Get('submission-assets/:id/file') async file(@CurrentUser()u:AuthUser,@Param('id')id:string,@Res()res:Response){const value=await this.service.asset(u.id,id);res.setHeader('Content-Type',value.asset.mimeType??'application/octet-stream');res.setHeader('Content-Disposition',`attachment; filename*=UTF-8''${encodeURIComponent(value.asset.name)}`);res.setHeader('Cache-Control','private, no-store');res.send(value.buffer);}
}

@ApiTags('Admin reviews') @ApiCookieAuth('access-cookie') @UseGuards(AuthGuard) @Roles('ADMIN') @Controller('admin/reviews')
export class AdminReviewsController { constructor(private service:WorkspaceService){} @Get() list(){return this.service.adminReviews();} @Patch(':id') moderate(@CurrentUser()u:AuthUser,@Param('id')id:string,@Body()dto:ModerateReviewDto){return this.service.moderate(u.id,id,dto.action);} }
