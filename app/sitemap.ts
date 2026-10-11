import type { MetadataRoute } from "next";
import { publicApi } from "@/lib/api";
import type { Campaign } from "@/lib/campaigns";
import { absoluteUrl } from "@/lib/seo";

type PagedResult<T> = {
  items: T[];
  pagination: { pages: number };
};

async function collectPublicPages<T>(path: string): Promise<T[]> {
  const separator = path.includes("?") ? "&" : "?";
  const first = await publicApi<PagedResult<T>>(`${path}${separator}limit=50&page=1`);
  if (!first) return [];
  if (first.pagination.pages <= 1) return first.items;
  const remaining = await Promise.all(
    Array.from({ length: first.pagination.pages - 1 }, (_, index) =>
      publicApi<PagedResult<T>>(`${path}${separator}limit=50&page=${index + 2}`),
    ),
  );
  return [first, ...remaining.filter((page): page is PagedResult<T> => Boolean(page))]
    .flatMap((page) => page.items);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticEntries: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/creators"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl("/campaigns"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl("/privacy"), lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: absoluteUrl("/terms"), lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: absoluteUrl("/support/account-deletion"), lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];

  const [creators, campaigns] = await Promise.all([
    collectPublicPages<{ slug: string }>("/creators?sort=newest"),
    collectPublicPages<Campaign>("/campaigns?sort=newest"),
  ]);

  const creatorEntries: MetadataRoute.Sitemap = creators.map((creator) => ({
    url: absoluteUrl(`/creators/${creator.slug}`),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const campaignEntries: MetadataRoute.Sitemap = campaigns.map((campaign) => ({
    url: absoluteUrl(`/campaigns/${campaign.slug}`),
    lastModified: campaign.updatedAt ? new Date(campaign.updatedAt) : undefined,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const businesses = new Map<string, string | undefined>();
  for (const campaign of campaigns) {
    businesses.set(campaign.business.slug, campaign.updatedAt);
  }
  const businessEntries: MetadataRoute.Sitemap = [...businesses].map(([slug, updatedAt]) => ({
    url: absoluteUrl(`/businesses/${slug}`),
    lastModified: updatedAt ? new Date(updatedAt) : undefined,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticEntries, ...creatorEntries, ...campaignEntries, ...businessEntries];
}
