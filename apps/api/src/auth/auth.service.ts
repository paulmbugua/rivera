import { BadRequestException, ConflictException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { MailService } from './mail.service';
import { ChangePasswordDto, LoginDto, RegisterDto, ResetDto } from './dto';
import { compare, hash } from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { Prisma, UserRole } from '@prisma/client';
const digest = (token: string) => createHash('sha256').update(token).digest('hex');
const random = () => randomBytes(32).toString('base64url');
const until = (ms: number) => new Date(Date.now() + ms);
const publicUser = (user: { id: string; email: string; firstName: string; lastName: string; status: string; emailVerifiedAt: Date | null; roles: { role: UserRole }[]; business?: { onboardingCompleted: boolean } | null; creator?: { onboardingCompleted: boolean } | null }) => ({ id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, status: user.status, emailVerified: !!user.emailVerifiedAt, roles: user.roles.map(r => r.role), onboardingCompleted: user.roles.some(r => r.role === 'BUSINESS') ? !!user.business?.onboardingCompleted : !!user.creator?.onboardingCompleted });
@Injectable()
export class AuthService {
  constructor(private db: PrismaService, private mail: MailService) {}
  async register(dto: RegisterDto) {
    if (dto.accountType === 'ADMIN') throw new BadRequestException('Choose Business or Content Creator');
    const email = dto.email.trim().toLowerCase();
    if (await this.db.user.findUnique({ where: { email } })) throw new ConflictException('An account already exists for this email');
    const passwordHash = await hash(dto.password, 12);
    try {
      const user = await this.db.user.create({ data: { email, passwordHash, firstName: dto.firstName.trim(), lastName: dto.lastName.trim(), roles: { create: { role: dto.accountType } } } });
      await this.issueEmailToken(user.id, email, 'verification');
      return { message: 'Account created. Check your email to verify it.' };
    } catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('An account already exists for this email'); throw error; }
  }
  private async issueEmailToken(userId: string, email: string, kind: 'verification' | 'reset') {
    const token = random();
    if (kind === 'verification') {
      await this.db.emailVerificationToken.create({ data: { userId, tokenHash: digest(token), expiresAt: until(24 * 60 * 60 * 1000) } });
      await this.mail.send(email, 'Verify your Rivera email', '/verify-email', token);
    } else {
      await this.db.passwordResetToken.create({ data: { userId, tokenHash: digest(token), expiresAt: until(60 * 60 * 1000) } });
      await this.mail.send(email, 'Reset your Rivera password', '/reset-password', token);
    }
  }
  async verify(token: string) {
    const item = await this.db.emailVerificationToken.findUnique({ where: { tokenHash: digest(token) } });
    if (!item || item.usedAt || item.expiresAt <= new Date()) throw new BadRequestException('This verification link is invalid or expired');
    await this.db.$transaction(async tx => {
      const updated = await tx.emailVerificationToken.updateMany({ where: { id: item.id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
      if (!updated.count) throw new BadRequestException('This verification link is invalid or expired');
      const account = await tx.user.updateMany({ where: { id: item.userId, status: 'PENDING_VERIFICATION', deletedAt: null }, data: { status: 'ACTIVE', emailVerifiedAt: new Date() } });
      if (!account.count) throw new BadRequestException('This account cannot be verified');
    });
    return { message: 'Email verified. You can now sign in.' };
  }
  async resend(email: string) {
    const user = await this.db.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (user && !user.emailVerifiedAt && !user.deletedAt) {
      const recent = await this.db.emailVerificationToken.findFirst({ where: { userId: user.id, createdAt: { gt: new Date(Date.now() - 60_000) } } });
      if (!recent) await this.issueEmailToken(user.id, user.email, 'verification');
    }
    return { message: 'If your account needs verification, a new link has been sent.' };
  }
  async login(dto: LoginDto, agent?: string, ip?: string) {
    const user = await this.db.user.findUnique({ where: { email: dto.email.trim().toLowerCase() }, include: { roles: true, business: true, creator: true } });
    if (!user || !(await compare(dto.password, user.passwordHash))) throw new UnauthorizedException('Invalid email or password');
    if (user.deletedAt || user.status === 'SUSPENDED' || user.status === 'DEACTIVATED') throw new ForbiddenException('Account unavailable');
    if (!user.emailVerifiedAt) throw new ForbiddenException('Verify your email before signing in');
    const refresh = random();
    const session = await this.db.refreshSession.create({ data: { userId: user.id, tokenHash: digest(refresh), expiresAt: until(30 * 24 * 60 * 60 * 1000), userAgent: agent?.slice(0, 255), ipAddress: ip?.slice(0, 64) } });
    await this.db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return { access: this.access(user.id, session.id), refresh, user: publicUser(user) };
  }
  private access(id: string, sid: string) { return jwt.sign({ sid }, process.env.JWT_ACCESS_SECRET!, { subject: id, expiresIn: '15m', algorithm: 'HS256' }); }
  async refresh(raw?: string) {
    if (!raw) throw new UnauthorizedException('Sign in again');
    const old = await this.db.refreshSession.findUnique({ where: { tokenHash: digest(raw) }, include: { user: { include: { roles: true, business: true, creator: true } } } });
    if (!old) throw new UnauthorizedException('Sign in again');
    if (old.revokedAt) { await this.db.refreshSession.updateMany({ where: { userId: old.userId, revokedAt: null }, data: { revokedAt: new Date() } }); throw new UnauthorizedException('Session reuse detected. Sign in again'); }
    if (old.expiresAt <= new Date() || old.user.status !== 'ACTIVE' || old.user.deletedAt) throw new UnauthorizedException('Sign in again');
    const refresh = random();
    const session = await this.db.$transaction(async tx => {
      const result = await tx.refreshSession.updateMany({ where: { id: old.id, revokedAt: null }, data: { revokedAt: new Date() } });
      if (!result.count) throw new UnauthorizedException('Sign in again');
      return tx.refreshSession.create({ data: { userId: old.userId, tokenHash: digest(refresh), expiresAt: until(30 * 24 * 60 * 60 * 1000), userAgent: old.userAgent, ipAddress: old.ipAddress } });
    });
    return { access: this.access(old.userId, session.id), refresh, user: publicUser(old.user) };
  }
  async logout(raw?: string) { if (raw) await this.db.refreshSession.updateMany({ where: { tokenHash: digest(raw), revokedAt: null }, data: { revokedAt: new Date() } }); return { message: 'Signed out' }; }
  async me(id: string) { const user = await this.db.user.findUniqueOrThrow({ where: { id }, include: { roles: true, business: true, creator: true } }); return publicUser(user); }
  async forgot(email: string) { const user = await this.db.user.findUnique({ where: { email: email.trim().toLowerCase() } }); if (user?.status === 'ACTIVE' && !user.deletedAt) await this.issueEmailToken(user.id, user.email, 'reset'); return { message: 'If that account exists, a reset link has been sent.' }; }
  async reset(dto: ResetDto) {
    const record = await this.db.passwordResetToken.findUnique({ where: { tokenHash: digest(dto.token) } });
    if (!record || record.usedAt || record.expiresAt <= new Date()) throw new BadRequestException('Password reset link is invalid or expired');
    const passwordHash = await hash(dto.password, 12);
    await this.db.$transaction(async tx => {
      const result = await tx.passwordResetToken.updateMany({ where: { id: record.id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
      if (!result.count) throw new BadRequestException('Password reset link is invalid or expired');
      await tx.user.update({ where: { id: record.userId }, data: { passwordHash } });
      await tx.refreshSession.updateMany({ where: { userId: record.userId, revokedAt: null }, data: { revokedAt: new Date() } });
      await tx.passwordResetToken.updateMany({ where: { userId: record.userId, usedAt: null }, data: { usedAt: new Date() } });
    });
    return { message: 'Password changed. Sign in again.' };
  }
  async changePassword(id: string, dto: ChangePasswordDto) {
    const user = await this.db.user.findUniqueOrThrow({ where: { id } });
    if (!(await compare(dto.currentPassword, user.passwordHash))) throw new UnauthorizedException('Current password is incorrect');
    await this.db.$transaction([this.db.user.update({ where: { id }, data: { passwordHash: await hash(dto.newPassword, 12) } }), this.db.refreshSession.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } })]);
    return { message: 'Password changed. Sign in again.' };
  }
  async deactivate(id: string) { await this.db.$transaction([this.db.user.update({ where: { id }, data: { status: 'DEACTIVATED', deletedAt: new Date() } }), this.db.refreshSession.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } })]); return { message: 'Account deactivated' }; }
}
