import { Body, Controller, Get, Patch, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { AuthGuard } from './guard';
import { ChangePasswordDto, EmailDto, FirebaseGoogleDto, GoogleRegisterDto, LoginDto, RegisterDto, ResetDto, TokenDto, UpdateProfileDto } from './dto';
import { CurrentUser } from './current-user.decorator';
import { randomBytes, timingSafeEqual } from 'node:crypto';
const duration = (value: string | undefined, fallback: number) => { const match=value?.match(/^(\d+)(s|m|h|d)$/); return match ? Number(match[1])*({s:1000,m:60_000,h:3_600_000,d:86_400_000}[match[2]]??1) : fallback };
const accessCookie = { httpOnly: true, secure: process.env.COOKIE_SECURE === 'true', sameSite: 'lax' as const, path: '/', maxAge: duration(process.env.JWT_ACCESS_EXPIRES_IN, 900_000) };
const refreshCookie = { ...accessCookie, path: '/api/v1/auth', maxAge: duration(process.env.JWT_REFRESH_EXPIRES_IN, 2_592_000_000) };
function setSession(res: Response, session: { access: string; refresh: string }) { res.cookie('rivera_access', session.access, accessCookie); res.cookie('rivera_refresh', session.refresh, refreshCookie); }
function clearSession(res: Response) { res.clearCookie('rivera_access', { path: '/' }); res.clearCookie('rivera_refresh', { path: '/api/v1/auth' }); }
const googleStateCookie = { httpOnly: true, secure: process.env.COOKIE_SECURE === 'true', sameSite: 'lax' as const, path: '/api/v1/auth/google', maxAge: 10 * 60_000 };
const same = (left?: string, right?: string) => !!left && !!right && left.length === right.length && timingSafeEqual(Buffer.from(left), Buffer.from(right));
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}
  @Throttle({ default: { limit: 5, ttl: 60_000 } }) @Post('register') @ApiOperation({ summary: 'Register a Business or Creator account' }) @ApiResponse({ status: 201, schema: { example: { user: { id:'ck...',email:'creator@example.com',firstName:'Amina',lastName:'Ali',roles:['CREATOR'],emailVerified:false,onboardingCompleted:false }, requiresEmailVerification:true } } }) register(@Body() dto: RegisterDto) { return this.auth.register(dto); }
  @Get('google/start') @ApiOperation({ summary: 'Begin secure Google OAuth for web' }) googleStart(@Res() res: Response) { const state = randomBytes(32).toString('base64url'); res.cookie('rivera_google_state', state, googleStateCookie); return res.redirect(this.auth.googleAuthorizationUrl(state)); }
  @Get('google/callback') @ApiOperation({ summary: 'Complete Google OAuth callback' }) async googleCallback(@Query('code') code: string, @Query('state') state: string, @Req() req: Request, @Res() res: Response) {
    const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
    if (!code || !same(state, req.cookies?.rivera_google_state)) { res.clearCookie('rivera_google_state', { path: '/api/v1/auth/google' }); return res.redirect(`${appUrl}/login?googleError=state`); }
    res.clearCookie('rivera_google_state', { path: '/api/v1/auth/google' });
    try {
      const result = await this.auth.googleWebIdentity(code);
      if (result.status === 'registration_required') return res.redirect(`${appUrl}/register/google?token=${encodeURIComponent(result.token)}`);
      if (result.status === 'verification_required') return res.redirect(`${appUrl}/resend-verification?google=verification`);
      const session = await this.auth.googleSession(result.user, req.headers['user-agent'], req.ip); setSession(res, session);
      const role = session.user.roles[0];
      const destination = role === 'ADMIN' ? '/admin' : session.user.onboardingCompleted ? `/dashboard/${role.toLowerCase()}` : `/onboarding/${role.toLowerCase()}`;
      return res.redirect(`${appUrl}${destination}`);
    } catch { return res.redirect(`${appUrl}/login?googleError=failed`); }
  }
  @Get('google/pending') @ApiOperation({ summary: 'Read a short-lived Google onboarding identity' }) googlePending(@Query('token') token: string) { return this.auth.oauthPending(token); }
  @Post('google/register') @ApiOperation({ summary: 'Finish Google registration and send Rivera activation email' }) googleRegister(@Body() dto: GoogleRegisterDto) { return this.auth.googleRegister(dto); }
  @Post('google/firebase') @ApiOperation({ summary: 'Verify Firebase Google identity for mobile' }) async firebaseGoogle(@Body() dto: FirebaseGoogleDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) { const result = await this.auth.firebaseGoogleIdentity(dto.idToken); if (result.status !== 'authenticated') return result; const session = await this.auth.googleSession(result.user, req.headers['user-agent'], req.ip); setSession(res, session); return { status: 'authenticated', user: session.user }; }
  @Post('verify-email') @ApiOperation({ summary: 'Verify a single-use email token' }) @ApiResponse({ status: 400, schema: { example: { statusCode:400,code:'VERIFICATION_TOKEN_EXPIRED',message:'This verification link has expired.' } } }) verify(@Body() dto: TokenDto) { return this.auth.verify(dto.token); }
  @Throttle({ default: { limit: 5, ttl: 60_000 } }) @Post('resend-verification') @ApiOperation({ summary: 'Invalidate older links and resend verification when eligible' }) resend(@Body() dto: EmailDto) { return this.auth.resend(dto.email); }
  @Throttle({ default: { limit: 10, ttl: 60_000 } }) @Post('login') @ApiOperation({ summary: 'Sign in and set rotating HttpOnly session cookies' }) @ApiResponse({ status: 401, schema: { example: { statusCode:401,code:'INVALID_CREDENTIALS',message:'Invalid email or password.' } } }) async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) { const session = await this.auth.login(dto, req.headers['user-agent'], req.ip); setSession(res, session); return { user: session.user }; }
  @Throttle({ default: { limit: 20, ttl: 60_000 } }) @Post('refresh') @ApiCookieAuth('access-cookie') @ApiOperation({ summary: 'Rotate the refresh session and access cookie' }) async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) { const session = await this.auth.refresh(req.cookies?.rivera_refresh); setSession(res, session); return { user: session.user }; }
  @Post('logout') @ApiCookieAuth('access-cookie') @ApiOperation({ summary: 'Revoke the current refresh session and clear cookies' }) async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) { const result = await this.auth.logout(req.cookies?.rivera_refresh); clearSession(res); return result; }
  // Next.js validates protected layouts during route prefetching. Those reads are
  // authenticated and side-effect free, so they must not consume the anonymous
  // abuse-prevention budget used by login and account-recovery endpoints.
  @SkipThrottle() @UseGuards(AuthGuard) @Get('me') @ApiCookieAuth('access-cookie') @ApiOperation({ summary: 'Return the authenticated public user' }) me(@CurrentUser() user: { id: string }) { return this.auth.me(user.id); }
  @UseGuards(AuthGuard) @Patch('profile') @ApiCookieAuth('access-cookie') @ApiOperation({ summary: 'Update name, phone, ISO country code, city and profile image' }) profile(@CurrentUser() user: { id: string }, @Body() dto: UpdateProfileDto) { return this.auth.updateProfile(user.id, dto); }
  @Throttle({ default: { limit: 5, ttl: 60_000 } }) @Post('forgot-password') @ApiOperation({ summary: 'Request password reset without revealing account existence' }) forgot(@Body() dto: EmailDto) { return this.auth.forgot(dto.email); }
  @Post('reset-password') @ApiOperation({ summary: 'Use a single-use reset token and revoke every session' }) @ApiResponse({ status: 400, schema: { example: { statusCode:400,code:'INVALID_RESET_TOKEN',message:'This password reset link is invalid or has already been used.' } } }) reset(@Body() dto: ResetDto) { return this.auth.reset(dto); }
  @UseGuards(AuthGuard) @Post('change-password') @ApiCookieAuth('access-cookie') @ApiOperation({ summary: 'Change password after confirmation and revoke every session' }) async change(@CurrentUser() user: { id: string }, @Body() dto: ChangePasswordDto, @Res({ passthrough: true }) res: Response) { const result = await this.auth.changePassword(user.id, dto); clearSession(res); return result; }
  @UseGuards(AuthGuard) @Post('deactivate') @ApiCookieAuth('access-cookie') @ApiOperation({ summary: 'Soft-deactivate the current account and revoke sessions' }) async deactivate(@CurrentUser() user: { id: string }, @Res({ passthrough: true }) res: Response) { const result = await this.auth.deactivate(user.id); clearSession(res); return result; }
}
