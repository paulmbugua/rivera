import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
const db = new PrismaClient();
async function main() {
  const email = process.env.ADMIN_SEED_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_SEED_PASSWORD;
  if (!email && !password) { console.log('No admin seed credentials configured; skipping.'); return; }
  if (!email || !password || password.length < 12) throw new Error('Provide ADMIN_SEED_EMAIL and a 12+ character ADMIN_SEED_PASSWORD');
  const existing = await db.user.findUnique({ where: { email }, include: { roles: true } });
  if (existing && !existing.roles.some(r => r.role === 'ADMIN')) throw new Error('Email already belongs to a non-admin user');
  if (existing) { console.log('Admin already exists. Password unchanged.'); return; }
  await db.user.create({ data: { email, passwordHash: await hash(password, 12), firstName: 'Rivera', lastName: 'Admin', status: 'ACTIVE', emailVerifiedAt: new Date(), roles: { create: { role: 'ADMIN' } } } });
  console.log('Admin created.');
}
main().finally(() => db.$disconnect());
