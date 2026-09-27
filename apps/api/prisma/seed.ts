import { PrismaClient, UserRole } from '@prisma/client';
import { hash } from 'bcryptjs';

const db = new PrismaClient();
const development = process.env.NODE_ENV !== 'production';
const demoPassword = process.env.CREATOR_SEED_PASSWORD ?? (development ? 'RiveraDemo123' : undefined);
const slug = (value: string) => value.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function seedUser(input: { email?: string; password?: string; firstName: string; lastName: string; role: UserRole }) {
  if (!input.email && !input.password) return null;
  if (!input.email || !input.password || input.password.length < 12) throw new Error(`Provide a valid email and 12+ character password for ${input.role}`);
  const email = input.email.trim().toLowerCase();
  const existing = await db.user.findUnique({ where: { email }, include: { roles: true } });
  if (existing && !existing.roles.some(role => role.role === input.role)) throw new Error(`${email} belongs to a different role`);
  if (existing) return existing;
  return db.user.create({ data: { email, passwordHash: await hash(input.password, 12), firstName: input.firstName, lastName: input.lastName, status: 'ACTIVE', emailVerifiedAt: new Date(), roles: { create: { role: input.role } } } });
}

const categoryNames = ['Technology','Fashion','Beauty','Food','Travel','Fitness','Sports','Gaming','Lifestyle','Finance','Business','Education','Automotive','Music','Entertainment','Parenting','Health & Wellness','Real Estate','Hospitality','Photography','Art & Design','Home & Living','Pets','Outdoor','Other'];
const industryNames = ['Retail','Technology','Hospitality','Food & Beverage','Beauty & Cosmetics','Fashion','Automotive','Real Estate','Travel & Tourism','Education','Healthcare','Financial Services','Professional Services','Entertainment','Sports & Fitness','E-commerce','Consumer Goods','Construction','Events','Telecommunications','Other'];
const contentNames = ['Short-form video','Long-form video','Instagram Reels','TikTok Videos','YouTube Videos','Stories','Photography','Product Reviews','Unboxing','UGC','Blog Articles','Livestreams','Podcasts','Tutorials','Testimonials','Event Coverage'];

async function seedTaxonomy() {
  for (const [sortOrder, name] of categoryNames.entries()) await db.category.upsert({ where: { slug: slug(name) }, create: { name, slug: slug(name), sortOrder }, update: { name, sortOrder, active: true } });
  for (const [sortOrder, name] of industryNames.entries()) await db.industry.upsert({ where: { slug: slug(name) }, create: { name, slug: slug(name), sortOrder }, update: { name, sortOrder, active: true } });
  for (const [sortOrder, name] of contentNames.entries()) await db.contentType.upsert({ where: { slug: slug(name) }, create: { name, slug: slug(name), sortOrder }, update: { name, sortOrder, active: true } });
}

const creatorFixtures = [
  ['Amina','Noor','Amina Noor','Food & Lifestyle Creator','Food','Lifestyle','INSTAGRAM',48200,'Nairobi','KE'],
  ['Leo','Mensah','Leo Mensah','Technology & AI Content Creator','Technology','Business','YOUTUBE',91600,'Accra','GH'],
  ['Sara','Hassan','Sara Hassan','Travel storyteller across the Gulf','Travel','Hospitality','TIKTOK',67400,'Doha','QA'],
  ['Maya','Patel','Maya Patel','Beauty and mindful living creator','Beauty','Lifestyle','INSTAGRAM',35200,'Mumbai','IN'],
  ['Noah','Williams','Noah Williams','Fitness educator and outdoor creator','Fitness','Outdoor','YOUTUBE',28900,'Cape Town','ZA'],
  ['Zuri','Okafor','Zuri Okafor','Fashion, art and design stories','Fashion','Art & Design','INSTAGRAM',74300,'Lagos','NG'],
  ['Omar','Saleh','Omar Saleh','Automotive reviews made practical','Automotive','Technology','YOUTUBE',126000,'Dubai','AE'],
  ['Elena','Garcia','Elena Garcia','Home, food and family ideas','Home & Living','Food','PINTEREST',19300,'Madrid','ES'],
  ['David','Kimani','David Kimani','Finance education for young founders','Finance','Education','TIKTOK',41700,'Nairobi','KE'],
  ['Layla','Chen','Layla Chen','Gaming and entertainment presenter','Gaming','Entertainment','TWITCH',58600,'Singapore','SG'],
  ['Sam','Taylor','Sam Taylor','Photography and outdoor adventures','Photography','Outdoor','INSTAGRAM',22100,'Vancouver','CA'],
  ['Nia','Brooks','Nia Brooks','Parenting and wellness conversations','Parenting','Health & Wellness','PODCAST',15900,'Atlanta','US'],
] as const;

async function seedCreators() {
  const categories = new Map((await db.category.findMany()).map(item => [item.name, item.id]));
  const contents = await db.contentType.findMany({ where: { slug: { in: ['short-form-video','photography','product-reviews'] } } });
  for (const [index, fixture] of creatorFixtures.entries()) {
    const [firstName,lastName,displayName,headline,primary,secondary,platform,followers,city,country] = fixture;
    const email = index === 0 ? (process.env.CREATOR_SEED_EMAIL ?? 'creator.demo@example.com') : `creator${index + 1}@rivera.example`;
    const user = await seedUser({ email, password: demoPassword, firstName, lastName, role: 'CREATOR' }); if (!user) continue;
    const profile = await db.creatorProfile.upsert({ where: { userId: user.id }, create: { userId: user.id, displayName, slug: slug(displayName), headline, bio: `${displayName} is a fictional Rivera demo creator producing thoughtful ${primary.toLowerCase()} content for global audiences.`, country, city, primaryCategory: primary, primaryPlatform: platform, onboardingCompleted: true, profileVisibility: index === 3 ? 'PRIVATE' : 'PUBLIC', publishedAt: index === 3 ? null : new Date(), verificationStatus: index === 0 ? 'VERIFIED' : 'UNVERIFIED', profileCompletion: 80, isFeatured: index < 3 }, update: { displayName, slug: slug(displayName), headline, bio: `${displayName} is a fictional Rivera demo creator producing thoughtful ${primary.toLowerCase()} content for global audiences.`, country, city, primaryCategory: primary, primaryPlatform: platform, profileVisibility: index === 3 ? 'PRIVATE' : 'PUBLIC', publishedAt: index === 3 ? null : new Date(), isFeatured: index < 3, ...(index === 0 ? { verificationStatus: 'VERIFIED' as const } : {}) } });
    await db.creatorCategory.deleteMany({ where: { creatorId: profile.id } });
    await db.creatorCategory.createMany({ data: [primary, secondary].map((name, categoryIndex) => ({ creatorId: profile.id, categoryId: categories.get(name)!, isPrimary: categoryIndex === 0 })) });
    await db.creatorContentType.deleteMany({ where: { creatorId: profile.id } });
    await db.creatorContentType.createMany({ data: contents.map(item => ({ creatorId: profile.id, contentTypeId: item.id })) });
    await db.creatorLanguage.deleteMany({ where: { creatorId: profile.id } });
    await db.creatorLanguage.createMany({ data: [{ creatorId: profile.id, languageCode: 'en', proficiency: 'PROFESSIONAL' }, ...(index === 0 ? [{ creatorId: profile.id, languageCode: 'sw', proficiency: 'NATIVE' as const }] : [])] });
    await db.creatorSocialAccount.deleteMany({ where: { creatorId: profile.id } });
    await db.creatorSocialAccount.create({ data: { creatorId: profile.id, platform, username: `@${slug(displayName)}`, profileUrl: `https://example.com/${slug(displayName)}`, followers, averageViews: Math.round(followers * .42), engagementRate: 4.75, isPrimary: true, verifiedByRivera: index === 0 } });
    await db.portfolioItem.deleteMany({ where: { creatorId: profile.id } });
    await db.portfolioItem.createMany({ data: [1,2].map(order => ({ creatorId: profile.id, title: `${primary} campaign concept ${order}`, description: 'Synthetic portfolio sample for local Rivera development.', mediaType: 'EXTERNAL_LINK', externalUrl: `https://example.com/portfolio/${slug(displayName)}/${order}`, brandName: 'Fictional Demo Brand', sortOrder: order - 1, published: true })) });
  }
}

async function seedBusinesses() {
  const fixtures = [['Rivera Demo Studio','Technology','Nairobi','KE',true],['Juniper Foods','Food & Beverage','Cape Town','ZA',false],['Northstar Stays','Hospitality','Doha','QA',false]] as const;
  for (const [index, [name, industryName, city, country, verified]] of fixtures.entries()) {
    const email = index === 0 ? (process.env.BUSINESS_SEED_EMAIL ?? 'business.demo@example.com') : `business${index + 1}@rivera.example`;
    const user = await seedUser({ email, password: process.env.BUSINESS_SEED_PASSWORD ?? demoPassword, firstName: name.split(' ')[0], lastName: 'Team', role: 'BUSINESS' }); if (!user) continue;
    const industry = await db.industry.findUniqueOrThrow({ where: { slug: slug(industryName) } });
    await db.businessProfile.upsert({ where: { userId: user.id }, create: { userId: user.id, name, slug: slug(name), country, city, industry: industryName, industryId: industry.id, description: `${name} is a fictional Rivera development business exploring responsible creator partnerships.`, shortDescription: `A fictional ${industryName.toLowerCase()} company.`, website: `https://example.com/${slug(name)}`, onboardingCompleted: true, profileVisibility: 'PUBLIC', publishedAt: new Date(), verificationStatus: verified ? 'VERIFIED' : 'UNVERIFIED', profileCompletion: 75 }, update: { name, slug: slug(name), country, city, industry: industryName, industryId: industry.id, description: `${name} is a fictional Rivera development business exploring responsible creator partnerships.`, shortDescription: `A fictional ${industryName.toLowerCase()} company.`, website: `https://example.com/${slug(name)}`, profileVisibility: 'PUBLIC', publishedAt: new Date(), ...(verified ? { verificationStatus: 'VERIFIED' as const } : {}) } });
  }
}

async function main() {
  if (!demoPassword) throw new Error('Seed passwords are required outside development.');
  await seedTaxonomy();
  const admin = await seedUser({ email: process.env.ADMIN_SEED_EMAIL ?? (development ? 'admin@rivera.local' : undefined), password: process.env.ADMIN_SEED_PASSWORD ?? demoPassword, firstName: 'Rivera', lastName: 'Admin', role: 'ADMIN' });
  await seedBusinesses(); await seedCreators();
  const pendingCreator = await db.creatorProfile.findFirst({ where: { verificationStatus: 'UNVERIFIED', profileVisibility: 'PUBLIC' } });
  if (pendingCreator && !await db.verificationRequest.findFirst({ where: { creatorProfileId: pendingCreator.id, status: 'PENDING' } })) await db.$transaction([db.creatorProfile.update({ where: { id: pendingCreator.id }, data: { verificationStatus: 'PENDING' } }), db.verificationRequest.create({ data: { userId: pendingCreator.userId, profileType: 'CREATOR', creatorProfileId: pendingCreator.id, noteFromUser: 'Synthetic development verification request.' } })]);
  console.log(`Phase 3 seed complete: admin=${Boolean(admin)}, businesses=3, creators=${creatorFixtures.length}.`);
}
main().finally(() => db.$disconnect());
