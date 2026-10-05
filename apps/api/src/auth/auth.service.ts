import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { MailService } from './mail.service';
import { ChangePasswordDto, GoogleRegisterDto, LoginDto, RegisterDto, ResetDto, UpdateProfileDto } from './dto';
import { compare, hash } from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import jwt, { SignOptions } from 'jsonwebtoken';
import { Prisma, UserRole } from '@prisma/client';
import { AuthErrors } from '../common/api-error';
import { OAuth2Client } from 'google-auth-library';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
const digest = (token: string) => createHash('sha256').update(token).digest('hex');
const random = () => randomBytes(32).toString('base64url');
const duration = (value: string | undefined, fallback: number) => { const match = value?.match(/^(\d+)(s|m|h|d)$/); if (!match) return fallback; return Number(match[1]) * ({ s:1000,m:60_000,h:3_600_000,d:86_400_000 }[match[2]] ?? 1); };
const until = (ms: number) => new Date(Date.now() + ms);
type PublicUserInput = { id: string; email: string; firstName: string; lastName: string; phone?: string | null; countryCode?: string | null; city?: string | null; profileImageUrl?: string | null; status: string; emailVerifiedAt: Date | null; roles: { role: UserRole }[]; business?: { onboardingCompleted: boolean } | null; creator?: { onboardingCompleted: boolean } | null };
type SessionUser = Prisma.UserGetPayload<{ include: { roles: true; business: true; creator: true } }>;
const publicUser = (user: PublicUserInput) => ({ id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, phone: user.phone ?? null, countryCode: user.countryCode ?? null, city: user.city ?? null, profileImageUrl: user.profileImageUrl ?? null, status: user.status, emailVerified: !!user.emailVerifiedAt, roles: user.roles.map(r => r.role), onboardingCompleted: user.roles.some(r => r.role === 'BUSINESS') ? !!user.business?.onboardingCompleted : user.roles.some(r => r.role === 'CREATOR') ? !!user.creator?.onboardingCompleted : true });
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(private db: PrismaService, private mail: MailService) {}
  private googleClient() {
    const clientId = process.env.GOOGLE_CLIENT_ID_WEB;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;
    if (!clientId || !clientSecret || !redirectUri) throw AuthErrors.googleUnavailable();
    return new OAuth2Client(clientId, clientSecret, redirectUri);
  }
  googleAuthorizationUrl(state: string) {
    return this.googleClient().generateAuthUrl({ scope: ['openid', 'email', 'profile'], state, prompt: 'select_account', access_type: 'online' });
  }
  async googleWebIdentity(code: string) {
    try {
      const client = this.googleClient();
      const { tokens } = await client.getToken(code);
      if (!tokens.id_token) throw AuthErrors.googleFailed();
      const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: process.env.GOOGLE_CLIENT_ID_WEB });
      const payload = ticket.getPayload();
      if (!payload?.sub || !payload.email || !payload.email_verified) throw AuthErrors.googleFailed();
      return this.acceptGoogleIdentity({ subject: payload.sub, email: payload.email, firstName: payload.given_name, lastName: payload.family_name, picture: payload.picture });
    } catch (error) {
      if (error instanceof Error && 'getStatus' in error) throw error;
      this.logger.warn('Google web identity verification failed');
      throw AuthErrors.googleFailed();
    }
  }
  async firebaseGoogleIdentity(idToken: string) {
    try {
      if (!getApps().length) {
        const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
        const account = encoded ? JSON.parse(encoded) : {
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        };
        if (!account.projectId) throw AuthErrors.googleUnavailable();
        initializeApp({
          projectId: account.projectId,
          ...(account.clientEmail && account.privateKey
            ? { credential: cert(account) }
            : {}),
        });
      }
      // Signature, issuer, audience and expiry verification only needs the
      // Firebase project ID. Revocation checks require Admin credentials and
      // can be enabled later when a service account is configured.
      const decoded = await getAuth().verifyIdToken(idToken, false);
      const googleSubjects = decoded.firebase?.identities?.['google.com'];
      const subject = Array.isArray(googleSubjects) ? googleSubjects[0] : undefined;
      if (decoded.firebase?.sign_in_provider !== 'google.com' || !subject || !decoded.email || decoded.email_verified !== true) throw AuthErrors.googleFailed();
      const parts = (decoded.name ?? '').trim().split(/\s+/);
      return this.acceptGoogleIdentity({ subject, email: decoded.email, firstName: parts[0], lastName: parts.slice(1).join(' '), picture: decoded.picture });
    } catch (error) {
      if (error instanceof Error && 'getStatus' in error) throw error;
      this.logger.warn('Firebase Google identity verification failed');
      throw AuthErrors.googleFailed();
    }
  }
  private async acceptGoogleIdentity(identity: { subject: string; email: string; firstName?: string; lastName?: string; picture?: string }) {
    const linked = await this.db.authIdentity.findUnique({ where: { provider_providerSubject: { provider: 'GOOGLE', providerSubject: identity.subject } }, include: { user: { include: { roles: true, business: true, creator: true } } } });
    if (linked) {
      if (!linked.user.emailVerifiedAt) return { status: 'verification_required' as const, email: linked.user.email };
      return { status: 'authenticated' as const, user: linked.user };
    }
    const email = identity.email.trim().toLowerCase();
    if (await this.db.user.findUnique({ where: { email } })) throw AuthErrors.emailExists();
    const token = random();
    await this.db.oAuthRegistration.create({ data: { tokenHash: digest(token), provider: 'GOOGLE', providerSubject: identity.subject, email, suggestedFirstName: identity.firstName?.slice(0, 80), suggestedLastName: identity.lastName?.slice(0, 80), profileImageUrl: identity.picture, expiresAt: until(10 * 60_000) } });
    return { status: 'registration_required' as const, token, email, firstName: identity.firstName ?? '', lastName: identity.lastName ?? '', profileImageUrl: identity.picture ?? null };
  }
  async oauthPending(token: string) {
    const pending = await this.db.oAuthRegistration.findUnique({ where: { tokenHash: digest(token) } });
    if (!pending || pending.usedAt || pending.expiresAt <= new Date()) throw AuthErrors.oauthRegistration();
    return { email: pending.email, firstName: pending.suggestedFirstName ?? '', lastName: pending.suggestedLastName ?? '', profileImageUrl: pending.profileImageUrl };
  }
  async googleRegister(dto: GoogleRegisterDto) {
    if (dto.accountType === 'ADMIN') throw AuthErrors.forbiddenRole();
    const pending = await this.db.oAuthRegistration.findUnique({ where: { tokenHash: digest(dto.token) } });
    if (!pending || pending.usedAt || pending.expiresAt <= new Date()) throw AuthErrors.oauthRegistration();
    if (await this.db.user.findUnique({ where: { email: pending.email } })) throw AuthErrors.emailExists();
    const user = await this.db.$transaction(async tx => {
      const consumed = await tx.oAuthRegistration.updateMany({ where: { id: pending.id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
      if (!consumed.count) throw AuthErrors.oauthRegistration();
      return tx.user.create({ data: { email: pending.email, passwordHash: null, firstName: dto.firstName.trim(), lastName: dto.lastName.trim(), profileImageUrl: pending.profileImageUrl, roles: { create: { role: dto.accountType } }, authIdentities: { create: { provider: pending.provider, providerSubject: pending.providerSubject } } }, include: { roles: true, business: true, creator: true } });
    });
    await this.issueEmailToken(user.id, user.email, 'verification');
    this.logger.log(`Google account created for user ${user.id}`);
    return { user: publicUser(user), requiresEmailVerification: true, message: 'Account created. Check your email to activate Rivera.' };
  }
  async register(dto: RegisterDto) {
    if (dto.accountType === 'ADMIN') throw AuthErrors.forbiddenRole();
    const email = dto.email.trim().toLowerCase();
    if (await this.db.user.findUnique({ where: { email } })) throw AuthErrors.emailExists();
    const passwordHash = await hash(dto.password, 12);
    try {
      const user = await this.db.user.create({ data: { email, passwordHash, firstName: dto.firstName.trim(), lastName: dto.lastName.trim(), roles: { create: { role: dto.accountType } } }, include: { roles: true, business: true, creator: true } });
      await this.issueEmailToken(user.id, email, 'verification');
      this.logger.log(`Account created for user ${user.id}`);
      return { user: publicUser(user), requiresEmailVerification: true, message: 'Account created. Check your email to verify it.' };
    } catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw AuthErrors.emailExists(); throw error; }
  }
  private async issueEmailToken(userId: string, email: string, kind: 'verification' | 'reset') {
    const token = random();
    if (kind === 'verification') {
      await this.db.emailVerificationToken.create({ data: { userId, tokenHash: digest(token), expiresAt: until(duration(process.env.EMAIL_VERIFICATION_EXPIRES_IN, 86_400_000)) } });
      await this.mail.sendVerificationEmail(email, token);
    } else {
      await this.db.passwordResetToken.create({ data: { userId, tokenHash: digest(token), expiresAt: until(duration(process.env.PASSWORD_RESET_EXPIRES_IN, 3_600_000)) } });
      await this.mail.sendPasswordResetEmail(email, token);
    }
  }
  async verify(token: string) {
    const item = await this.db.emailVerificationToken.findUnique({ where: { tokenHash: digest(token) } });
    if (!item || item.usedAt) throw AuthErrors.invalidVerification();
    if (item.expiresAt <= new Date()) throw AuthErrors.expiredVerification();
    await this.db.$transaction(async tx => {
      const updated = await tx.emailVerificationToken.updateMany({ where: { id: item.id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
      if (!updated.count) throw AuthErrors.invalidVerification();
      const account = await tx.user.updateMany({ where: { id: item.userId, status: 'PENDING_VERIFICATION', deletedAt: null }, data: { status: 'ACTIVE', emailVerifiedAt: new Date() } });
      if (!account.count) throw AuthErrors.accountNotVerifiable();
    });
    const verified = await this.db.user.findUniqueOrThrow({ where: { id: item.userId } });
    await this.mail.sendWelcomeEmail(verified.email, verified.firstName);
    this.logger.log(`Email verification completed for user ${item.userId}`);
    return { message: 'Email verified. You can now sign in.' };
  }
  async resend(email: string) {
    const user = await this.db.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (user && !user.emailVerifiedAt && !user.deletedAt) {
      const recent = await this.db.emailVerificationToken.findFirst({ where: { userId: user.id, createdAt: { gt: new Date(Date.now() - 60_000) } } });
      if (!recent) { await this.db.emailVerificationToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } }); await this.issueEmailToken(user.id, user.email, 'verification'); }
    }
    return { message: 'If your account needs verification, a new link has been sent.' };
  }
  async login(dto: LoginDto, agent?: string, ip?: string) {
    const user = await this.db.user.findUnique({ where: { email: dto.email.trim().toLowerCase() }, include: { roles: true, business: true, creator: true } });
    if (!user?.passwordHash || !(await compare(dto.password, user.passwordHash))) { this.logger.warn('Failed login attempt'); throw AuthErrors.invalidCredentials(); }
    if (user.status === 'SUSPENDED') { this.logger.warn(`Suspended account login attempt for user ${user.id}`); throw AuthErrors.suspended(); }
    if (user.deletedAt || user.status === 'DEACTIVATED') { this.logger.warn(`Deactivated account login attempt for user ${user.id}`); throw AuthErrors.deactivated(); }
    if (!user.emailVerifiedAt) throw AuthErrors.emailNotVerified();
    return this.createSession(user, agent, ip);
  }
  async googleSession(user: SessionUser, agent?: string, ip?: string) {
    if (user.status === 'SUSPENDED') throw AuthErrors.suspended();
    if (user.deletedAt || user.status === 'DEACTIVATED') throw AuthErrors.deactivated();
    if (!user.emailVerifiedAt) throw AuthErrors.emailNotVerified();
    return this.createSession(user, agent, ip);
  }
  private async createSession(user: SessionUser, agent?: string, ip?: string) {
    const refresh = random();
    const session = await this.db.refreshSession.create({ data: { userId: user.id, tokenHash: digest(refresh), expiresAt: until(duration(process.env.JWT_REFRESH_EXPIRES_IN, 2_592_000_000)), userAgent: agent?.slice(0, 255), ipAddress: ip?.slice(0, 64) } });
    await this.db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return { access: this.access(user.id, session.id, user.roles.map(r => r.role)), refresh, user: publicUser(user) };
  }
  private access(id: string, sid: string, roles: UserRole[]) { return jwt.sign({ sid, roles }, process.env.JWT_ACCESS_SECRET!, { subject: id, expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN ?? '15m') as SignOptions['expiresIn'], algorithm: 'HS256' }); }
  async refresh(raw?: string) {
    if (!raw) throw AuthErrors.unauthenticated('Sign in again.');
    const old = await this.db.refreshSession.findUnique({ where: { tokenHash: digest(raw) }, include: { user: { include: { roles: true, business: true, creator: true } } } });
    if (!old) throw AuthErrors.unauthenticated('Sign in again.');
    if (old.revokedAt) { await this.db.refreshSession.updateMany({ where: { userId: old.userId, revokedAt: null }, data: { revokedAt: new Date() } }); throw AuthErrors.unauthenticated('Session reuse detected. Sign in again.'); }
    if (old.expiresAt <= new Date() || old.user.status !== 'ACTIVE' || old.user.deletedAt) throw AuthErrors.unauthenticated('Sign in again.');
    const refresh = random();
    const session = await this.db.$transaction(async tx => {
      const result = await tx.refreshSession.updateMany({ where: { id: old.id, revokedAt: null }, data: { revokedAt: new Date() } });
      if (!result.count) throw AuthErrors.unauthenticated('Sign in again.');
      return tx.refreshSession.create({ data: { userId: old.userId, tokenHash: digest(refresh), expiresAt: until(duration(process.env.JWT_REFRESH_EXPIRES_IN, 2_592_000_000)), userAgent: old.userAgent, ipAddress: old.ipAddress } });
    });
    return { access: this.access(old.userId, session.id, old.user.roles.map(r => r.role)), refresh, user: publicUser(old.user) };
  }
  async logout(raw?: string) { if (raw) await this.db.refreshSession.updateMany({ where: { tokenHash: digest(raw), revokedAt: null }, data: { revokedAt: new Date() } }); return { message: 'Signed out' }; }
  async me(id: string) { const user = await this.db.user.findUniqueOrThrow({ where: { id }, include: { roles: true, business: true, creator: true } }); return publicUser(user); }
  async forgot(email: string) { const user = await this.db.user.findUnique({ where: { email: email.trim().toLowerCase() } }); if (user?.status === 'ACTIVE' && !user.deletedAt) { await this.issueEmailToken(user.id, user.email, 'reset'); this.logger.log(`Password reset requested for user ${user.id}`); } return { message: 'If an account exists for this email, password reset instructions have been sent.' }; }
  async reset(dto: ResetDto) {
    const record = await this.db.passwordResetToken.findUnique({ where: { tokenHash: digest(dto.token) } });
    if (!record || record.usedAt) throw AuthErrors.invalidReset();
    if (record.expiresAt <= new Date()) throw AuthErrors.expiredReset();
    const passwordHash = await hash(dto.password, 12);
    await this.db.$transaction(async tx => {
      const result = await tx.passwordResetToken.updateMany({ where: { id: record.id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
      if (!result.count) throw AuthErrors.invalidReset();
      await tx.user.update({ where: { id: record.userId }, data: { passwordHash } });
      await tx.refreshSession.updateMany({ where: { userId: record.userId, revokedAt: null }, data: { revokedAt: new Date() } });
      await tx.passwordResetToken.updateMany({ where: { userId: record.userId, usedAt: null }, data: { usedAt: new Date() } });
    });
    this.logger.log(`Password reset completed for user ${record.userId}`);
    return { message: 'Password changed. Sign in again.' };
  }
  async changePassword(id: string, dto: ChangePasswordDto) {
    if (dto.newPassword !== dto.confirmPassword) throw AuthErrors.passwordConfirmation();
    const user = await this.db.user.findUniqueOrThrow({ where: { id } });
    if (!user.passwordHash || !(await compare(dto.currentPassword, user.passwordHash))) throw AuthErrors.currentPassword();
    await this.db.$transaction([this.db.user.update({ where: { id }, data: { passwordHash: await hash(dto.newPassword, 12) } }), this.db.refreshSession.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } })]);
    return { message: 'Password changed. Sign in again.' };
  }
  async updateProfile(id: string, dto: UpdateProfileDto) {
    const user = await this.db.user.update({ where: { id }, data: { firstName: dto.firstName.trim(), lastName: dto.lastName.trim(), phone: dto.phone?.trim() || null, countryCode: dto.countryCode?.toUpperCase() || null, city: dto.city?.trim() || null, profileImageUrl: dto.profileImageUrl?.trim() || null }, include: { roles: true, business: true, creator: true } });
    return publicUser(user);
  }
  async deactivate(id: string) { await this.db.$transaction([this.db.user.update({ where: { id }, data: { status: 'DEACTIVATED', deletedAt: new Date() } }), this.db.refreshSession.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } })]); return { message: 'Account deactivated' }; }
}
