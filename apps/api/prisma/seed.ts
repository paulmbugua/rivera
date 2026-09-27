import { PrismaClient, UserRole } from '@prisma/client';
import { hash } from 'bcryptjs';

const db = new PrismaClient();
const development = process.env.NODE_ENV !== 'production';
const passwordFor = (key: string) => process.env[key] ?? (development ? 'RiveraDemo123' : undefined);

async function seedUser(input: { email?: string; password?: string; firstName: string; lastName: string; role: UserRole }) {
  if (!input.email && !input.password) return null;
  if (!input.email || !input.password || input.password.length < 12) throw new Error(`Provide a valid email and 12+ character password for ${input.role}`);
  const email = input.email.trim().toLowerCase();
  const existing = await db.user.findUnique({ where: { email }, include: { roles: true } });
  if (existing && !existing.roles.some(role => role.role === input.role)) throw new Error(`${email} belongs to a different role`);
  if (existing) return existing;
  return db.user.create({ data: { email, passwordHash: await hash(input.password, 12), firstName: input.firstName, lastName: input.lastName, status: 'ACTIVE', emailVerifiedAt: new Date(), roles: { create: { role: input.role } } } });
}

async function main() {
  const admin = await seedUser({ email: process.env.ADMIN_SEED_EMAIL ?? (development ? 'admin@rivera.local' : undefined), password: passwordFor('ADMIN_SEED_PASSWORD'), firstName: 'Rivera', lastName: 'Admin', role: 'ADMIN' });
  const business = await seedUser({ email: process.env.BUSINESS_SEED_EMAIL ?? (development ? 'business.demo@example.com' : undefined), password: passwordFor('BUSINESS_SEED_PASSWORD'), firstName: 'Amina', lastName: 'Business', role: 'BUSINESS' });
  const creator = await seedUser({ email: process.env.CREATOR_SEED_EMAIL ?? (development ? 'creator.demo@example.com' : undefined), password: passwordFor('CREATOR_SEED_PASSWORD'), firstName: 'Kamau', lastName: 'Creator', role: 'CREATOR' });
  if (business) await db.businessProfile.upsert({ where: { userId: business.id }, create: { userId: business.id, name: 'Rivera Demo Studio', country: 'KE', city: 'Nairobi', industry: 'Marketing', description: 'A fictional development business account.', onboardingCompleted: true }, update: {} });
  if (creator) await db.creatorProfile.upsert({ where: { userId: creator.id }, create: { userId: creator.id, displayName: 'Kamau Creates', country: 'KE', city: 'Nairobi', primaryCategory: 'Technology', primaryPlatform: 'YouTube', bio: 'A fictional development creator account.', onboardingCompleted: true }, update: {} });
  console.log(`Seed complete: ${[admin,business,creator].filter(Boolean).length} development accounts ready.`);
}
main().finally(() => db.$disconnect());
