import 'reflect-metadata';
import test from 'node:test';
import assert from 'node:assert/strict';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { BusinessProfileDto, CreatorProfileDto, DirectoryQueryDto, PortfolioDto, SocialAccountDto, VerificationRequestDto } from '../src/marketplace/dto';
import { slugBase } from '../src/marketplace/marketplace.service';
import { LocalStorageService } from '../src/storage/storage.service';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

test('profile slugs are normalized without exposing identifiers', () => {
  assert.equal(slugBase('Amina Noor — Food & Travel!'), 'amina-noor-food-travel');
  assert.equal(slugBase('  Rivera Digital  '), 'rivera-digital');
});

test('creator profile limits categories to five and requires ISO country codes', async () => {
  const dto = plainToInstance(CreatorProfileDto, { countryCode: 'Kenya', categoryIds: ['1','2','3','4','5','6'] });
  const errors = await validate(dto);
  assert.ok(errors.some(error => error.property === 'countryCode'));
  assert.ok(errors.some(error => error.property === 'categoryIds'));
});

test('social metrics reject negative followers and engagement above 100', async () => {
  const dto = plainToInstance(SocialAccountDto, { platform: 'INSTAGRAM', username: 'amina', followers: -1, engagementRate: 100.01 });
  const errors = await validate(dto);
  assert.ok(errors.some(error => error.property === 'followers'));
  assert.ok(errors.some(error => error.property === 'engagementRate'));
});

test('portfolio URLs reject executable schemes', async () => {
  const dto = plainToInstance(PortfolioDto, { title: 'Unsafe', mediaType: 'EXTERNAL_LINK', externalUrl: 'javascript:alert(1)' });
  assert.ok((await validate(dto)).some(error => error.property === 'externalUrl'));
});

test('business year established cannot be in the future', async () => {
  const dto = plainToInstance(BusinessProfileDto, { yearEstablished: new Date().getFullYear() + 1 });
  assert.ok((await validate(dto)).some(error => error.property === 'yearEstablished'));
});

test('creator directory clamps page size', async () => {
  const dto = plainToInstance(DirectoryQueryDto, { page: 1, limit: 500 });
  assert.ok((await validate(dto)).some(error => error.property === 'limit'));
});

test('verification requests accept only creator or business profile types', async () => {
  const dto = plainToInstance(VerificationRequestDto, { profileType: 'ADMIN' });
  assert.ok((await validate(dto)).some(error => error.property === 'profileType'));
});

test('local storage validates image magic bytes and generates safe object names', async () => {
  process.env.LOCAL_UPLOAD_DIR = join(tmpdir(), `rivera-storage-${Date.now()}`);
  process.env.MEDIA_PUBLIC_URL = 'http://localhost:4000/media';
  const storage = new LocalStorageService();
  await assert.rejects(() => storage.upload('creator-1', 'profile', { mimetype: 'image/png', size: 4, buffer: Buffer.from('fake') }));
  const png = Buffer.from([137,80,78,71,13,10,26,10,0]);
  const saved = await storage.upload('creator-1', 'profile', { mimetype: 'image/png', size: png.length, buffer: png });
  assert.match(saved.key, /^creator-1\/profile\/[a-f0-9-]+\.png$/);
  assert.equal(saved.url.startsWith('http://localhost:4000/media/creator-1/profile/'), true);
  await storage.delete(saved.key);
});
