import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AuthService } from '../src/auth/auth.service';
import { AuthGuard } from '../src/auth/guard';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { compare } from 'bcryptjs';
import { PrismaService } from '../src/common/prisma.service';
import { MailService } from '../src/auth/mail.service';
const secret = 'test-secret-that-is-longer-than-32-characters';
process.env.JWT_ACCESS_SECRET = secret;
function fixture() {
  const sent: string[] = [];
  const records: Array<Record<string, unknown>> = [];
  const db = { user: { findUnique: async () => null, create: async ({ data }: { data: Record<string, unknown> }) => { records.push(data); return { id: 'user-1', email: data.email }; } }, emailVerificationToken: { create: async () => ({ id: 'token-1' }) } };
  const mail = { send: async (_to: string, _subject: string, _path: string, token: string) => { sent.push(token); } };
  return { service: new AuthService(db as unknown as PrismaService, mail as unknown as MailService), db, records, sent };
}
test('registration rejects administrator self-registration', async () => {
  const { service, records } = fixture();
  await assert.rejects(service.register({ firstName: 'A', lastName: 'B', email: 'a@example.com', password: 'correct horse battery', accountType: 'ADMIN' }), BadRequestException);
  assert.equal(records.length, 0);
});
test('registration normalizes email and hashes the password', async () => {
  const { service, records, sent } = fixture();
  await service.register({ firstName: 'Alex', lastName: 'Creator', email: '  ALEX@EXAMPLE.COM ', password: 'correct horse battery', accountType: 'CREATOR' });
  assert.equal(records[0].email, 'alex@example.com');
  assert.notEqual(records[0].passwordHash, 'correct horse battery');
  assert.ok(await compare('correct horse battery', String(records[0].passwordHash)));
  assert.equal(sent.length, 1);
});
test('refresh rejects a revoked token and revokes remaining sessions', async () => {
  let revoked = false;
  const db = { refreshSession: { findUnique: async () => ({ id: 'old', userId: 'user-1', revokedAt: new Date(), expiresAt: new Date(Date.now() + 10000), user: { status: 'ACTIVE' } }), updateMany: async () => { revoked = true; return { count: 1 }; } } };
  const service = new AuthService(db as unknown as PrismaService, {} as MailService);
  await assert.rejects(service.refresh('reused-opaque-token'), UnauthorizedException);
  assert.ok(revoked);
});
test('expired verification token cannot activate an account', async () => {
  const db = { emailVerificationToken: { findUnique: async () => ({ id: 'old', usedAt: null, expiresAt: new Date(0) }) } };
  await assert.rejects(new AuthService(db as unknown as PrismaService, {} as MailService).verify('expired'), BadRequestException);
});
test('role guard rejects access when the assigned role differs', async () => {
  const jwt = (await import('jsonwebtoken')).default;
  const token = jwt.sign({ sid: 'session-1' }, secret, { subject: 'user-1', expiresIn: '15m' });
  const db = { refreshSession: { findUnique: async () => ({ id: 'session-1', userId: 'user-1', revokedAt: null, expiresAt: new Date(Date.now() + 10000) }) }, user: { findUnique: async () => ({ id: 'user-1', email: 'a@example.com', status: 'ACTIVE', deletedAt: null, roles: [{ role: 'CREATOR' }] }) } };
  const reflector = { getAllAndOverride: () => ['BUSINESS'] };
  const context = { switchToHttp: () => ({ getRequest: () => ({ cookies: { rivera_access: token } }) }), getHandler: () => null, getClass: () => null };
  await assert.rejects(new AuthGuard(db as unknown as PrismaService, reflector as never).canActivate(context as never), { name: 'ForbiddenException' });
});
test('login rejects wrong passwords with a generic error', async () => {
  const db = { user: { findUnique: async () => ({ email: 'a@example.com', passwordHash: await (await import('bcryptjs')).hash('right-password-here', 4) }) } };
  await assert.rejects(new AuthService(db as unknown as PrismaService, {} as MailService).login({ email: 'a@example.com', password: 'wrong-password' }), (error: unknown) => error instanceof UnauthorizedException && error.message === 'Invalid email or password');
});
test('password reset changes the hash and revokes active sessions', async () => {
  const { createHash } = await import('node:crypto');
  const token = 'opaque-reset-token';
  const tokenHash = createHash('sha256').update(token).digest('hex');
  let nextHash = ''; let revoked = false;
  const tx = { passwordResetToken: { updateMany: async () => ({ count: 1 }) }, user: { update: async ({ data }: { data: { passwordHash: string } }) => { nextHash = data.passwordHash; } }, refreshSession: { updateMany: async () => { revoked = true; } } };
  const db = { passwordResetToken: { findUnique: async ({ where }: { where: { tokenHash: string } }) => where.tokenHash === tokenHash ? ({ id: 'reset-1', userId: 'user-1', usedAt: null, expiresAt: new Date(Date.now() + 10000) }) : null }, $transaction: async (fn: (value: typeof tx) => Promise<unknown>) => fn(tx) };
  await new AuthService(db as unknown as PrismaService, {} as MailService).reset({ token, password: 'a-new-strong-password' });
  assert.ok(await compare('a-new-strong-password', nextHash));
  assert.ok(revoked);
});
