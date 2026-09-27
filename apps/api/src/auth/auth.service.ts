import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { MailService } from './mail.service';
import { ChangePasswordDto, LoginDto, RegisterDto, ResetDto, UpdateProfileDto } from './dto';
import { compare, hash } from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import jwt, { SignOptions } from 'jsonwebtoken';
import { Prisma, UserRole } from '@prisma/client';
import { AuthErrors } from '../common/api-error';
const digest = (token: string) => createHash('sha256').update(token).digest('hex');
const random = () => randomBytes(32).toString('base64url');
const duration = (value: string | undefined, fallback: number) => { const match = value?.match(/^(\d+)(s|m|h|d)$/); if (!match) return fallback; return Number(match[1]) * ({ s:1000,m:60_000,h:3_600_000,d:86_400_000 }[match[2]] ?? 1); };
const until = (ms: number) => new Date(Date.now() + ms);
type PublicUserInput = { id: string; email: string; firstName: string; lastName: string; phone?: string | null; countryCode?: string | null; city?: string | null; profileImageUrl?: string | null; status: string; emailVerifiedAt: Date | null; roles: { role: UserRole }[]; business?: { onboardingCompleted: boolean } | null; creator?: { onboardingCompleted: boolean } | null };
const publicUser = (user: PublicUserInput) => ({ id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, phone: user.phone ?? null, countryCode: user.countryCode ?? null, city: user.city ?? null, profileImageUrl: user.profileImageUrl ?? null, status: user.status, emailVerified: !!user.emailVerifiedAt, roles: user.roles.map(r => r.role), onboardingCompleted: user.roles.some(r => r.role === 'BUSINESS') ? !!user.business?.onboardingCompleted : user.roles.some(r => r.role === 'CREATOR') ? !!user.creator?.onboardingCompleted : true });
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(private db: PrismaService, private mail: MailService) {}
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
    if (!user || !(await compare(dto.password, user.passwordHash))) { this.logger.warn('Failed login attempt'); throw AuthErrors.invalidCredentials(); }
    if (user.status === 'SUSPENDED') { this.logger.warn(`Suspended account login attempt for user ${user.id}`); throw AuthErrors.suspended(); }
    if (user.deletedAt || user.status === 'DEACTIVATED') { this.logger.warn(`Deactivated account login attempt for user ${user.id}`); throw AuthErrors.deactivated(); }
    if (!user.emailVerifiedAt) throw AuthErrors.emailNotVerified();
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
    if (!(await compare(dto.currentPassword, user.passwordHash))) throw AuthErrors.currentPassword();
    await this.db.$transaction([this.db.user.update({ where: { id }, data: { passwordHash: await hash(dto.newPassword, 12) } }), this.db.refreshSession.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } })]);
    return { message: 'Password changed. Sign in again.' };
  }
  async updateProfile(id: string, dto: UpdateProfileDto) {
    const user = await this.db.user.update({ where: { id }, data: { firstName: dto.firstName.trim(), lastName: dto.lastName.trim(), phone: dto.phone?.trim() || null, countryCode: dto.countryCode?.toUpperCase() || null, city: dto.city?.trim() || null, profileImageUrl: dto.profileImageUrl?.trim() || null }, include: { roles: true, business: true, creator: true } });
    return publicUser(user);
  }
  async deactivate(id: string) { await this.db.$transaction([this.db.user.update({ where: { id }, data: { status: 'DEACTIVATED', deletedAt: new Date() } }), this.db.refreshSession.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } })]); return { message: 'Account deactivated' }; }
}
