import type { PrismaClient } from '@prisma/client';

export const categoryNames = ['Technology','Fashion','Beauty','Food','Travel','Fitness','Sports','Gaming','Lifestyle','Finance','Business','Education','Automotive','Music','Entertainment','Parenting','Health & Wellness','Real Estate','Hospitality','Photography','Art & Design','Home & Living','Pets','Outdoor','Other'];
export const industryNames = ['Retail','Technology','Hospitality','Food & Beverage','Beauty & Cosmetics','Fashion','Automotive','Real Estate','Travel & Tourism','Education','Healthcare','Financial Services','Professional Services','Entertainment','Sports & Fitness','E-commerce','Consumer Goods','Construction','Events','Telecommunications','Other'];
export const contentNames = ['Short-form video','Long-form video','Instagram Reels','TikTok Videos','YouTube Videos','Stories','Photography','Product Reviews','Unboxing','UGC','Blog Articles','Livestreams','Podcasts','Tutorials','Testimonials','Event Coverage'];

const rows=(names:string[])=>names.map((name,sortOrder)=>({name,slug:name.toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''),sortOrder}));

// Insert only missing lookup values. Keep existing IDs, custom names and disabled entries.
export async function seedReferenceData(db:PrismaClient) {
  const [categories,industries,contentTypes]=await db.$transaction([
    db.category.createMany({data:rows(categoryNames),skipDuplicates:true}),
    db.industry.createMany({data:rows(industryNames),skipDuplicates:true}),
    db.contentType.createMany({data:rows(contentNames),skipDuplicates:true}),
  ]);
  return {categories:categories.count,industries:industries.count,contentTypes:contentTypes.count};
}
