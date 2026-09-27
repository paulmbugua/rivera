import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validate } from 'class-validator';
import { OnboardingController } from '../src/onboarding/onboarding.controller';
import { BusinessDto, CreatorDto } from '../src/onboarding/dto';
import { PrismaService } from '../src/common/prisma.service';

test('Business onboarding normalizes country and completes the profile', async () => {
  let operation: Record<string, unknown> | undefined;
  const db = { businessProfile: { upsert: async (input: Record<string, unknown>) => { operation = input; } } };
  const result = await new OnboardingController(db as unknown as PrismaService).business(
    { id: 'business-1' },
    { name: ' Acme ', country: 'ke', city: ' Nairobi ', industry: ' Technology ', description: ' A global technology business. ', website: 'https://example.com' },
  );
  assert.equal(result.next, '/dashboard/business');
  const created = operation?.create as { userId: string; country: string; onboardingCompleted: boolean };
  assert.equal(created.userId, 'business-1');
  assert.equal(created.country, 'KE');
  assert.equal(created.onboardingCompleted, true);
});

test('Creator onboarding normalizes country and completes the profile', async () => {
  let operation: Record<string, unknown> | undefined;
  const db = { creatorProfile: { upsert: async (input: Record<string, unknown>) => { operation = input; } } };
  const result = await new OnboardingController(db as unknown as PrismaService).creator(
    { id: 'creator-1' },
    { displayName: ' Amina Creates ', country: 'qa', city: ' Doha ', primaryCategory: 'Travel', primaryPlatform: 'Instagram', bio: ' Travel stories from around the world. ' },
  );
  assert.equal(result.next, '/dashboard/creator');
  const created = operation?.create as { userId: string; country: string; onboardingCompleted: boolean };
  assert.equal(created.userId, 'creator-1');
  assert.equal(created.country, 'QA');
  assert.equal(created.onboardingCompleted, true);
});

test('onboarding DTOs reject non-ISO countries and missing profile details', async () => {
  const business = Object.assign(new BusinessDto(), { name: 'A', country: 'Kenya', city: '', industry: '', description: 'short' });
  const creator = Object.assign(new CreatorDto(), { displayName: 'A', country: 'Qatar', city: '', primaryCategory: 'Unknown', primaryPlatform: 'Unknown', bio: 'short' });
  assert.ok((await validate(business)).length >= 4);
  assert.ok((await validate(creator)).length >= 5);
});
