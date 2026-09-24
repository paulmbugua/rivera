import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { AuthGuard, AuthRequest } from './guard';
import { ChangePasswordDto, EmailDto, LoginDto, RegisterDto, ResetDto, TokenDto } from './dto';
const accessCookie = { httpOnly: true, secure: process.env.COOKIE_SECURE === 'true', sameSite: 'lax' as const, path: '/api/v1', maxAge: 15 * 60 * 1000 };
const refreshCookie = { ...accessCookie, path: '/api/v1/auth', maxAge: 30 * 24 * 60 * 60 * 1000 };
function setSession(res: Response, session: { access: string; refresh: string }) { res.cookie('rivera_access', session.access, accessCookie); res.cookie('rivera_refresh', session.refresh, refreshCookie); }
function clearSession(res: Response) { res.clearCookie('rivera_access', { path: '/api/v1' }); res.clearCookie('rivera_refresh', { path: '/api/v1/auth' }); }
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}
  @Throttle({ default: { limit: 5, ttl: 60_000 } }) @Post('register') register(@Body() dto: RegisterDto) { return this.auth.register(dto); }
  @Post('verify-email') verify(@Body() dto: TokenDto) { return this.auth.verify(dto.token); }
  @Throttle({ default: { limit: 5, ttl: 60_000 } }) @Post('resend-verification') resend(@Body() dto: EmailDto) { return this.auth.resend(dto.email); }
  @Throttle({ default: { limit: 10, ttl: 60_000 } }) @Post('login') async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) { const session = await this.auth.login(dto, req.headers['user-agent'], req.ip); setSession(res, session); return { user: session.user }; }
  @Throttle({ default: { limit: 20, ttl: 60_000 } }) @Post('refresh') async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) { const session = await this.auth.refresh(req.cookies?.rivera_refresh); setSession(res, session); return { user: session.user }; }
  @Post('logout') async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) { const result = await this.auth.logout(req.cookies?.rivera_refresh); clearSession(res); return result; }
  @UseGuards(AuthGuard) @Get('me') me(@Req() req: AuthRequest) { return this.auth.me(req.user.id); }
  @Throttle({ default: { limit: 5, ttl: 60_000 } }) @Post('forgot-password') forgot(@Body() dto: EmailDto) { return this.auth.forgot(dto.email); }
  @Post('reset-password') reset(@Body() dto: ResetDto) { return this.auth.reset(dto); }
  @UseGuards(AuthGuard) @Post('change-password') async change(@Req() req: AuthRequest, @Body() dto: ChangePasswordDto, @Res({ passthrough: true }) res: Response) { const result = await this.auth.changePassword(req.user.id, dto); clearSession(res); return result; }
  @UseGuards(AuthGuard) @Post('deactivate') async deactivate(@Req() req: AuthRequest, @Res({ passthrough: true }) res: Response) { const result = await this.auth.deactivate(req.user.id); clearSession(res); return result; }
}
