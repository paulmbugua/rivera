import { JsonLd } from "@/components/rivera/json-ld";
import { publicApi } from "@/lib/api";
import type { Campaign } from "@/lib/campaigns";
import { absoluteUrl } from "@/lib/seo";

export default async function CampaignLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const campaign = await publicApi<Campaign>(`/campaigns/${encodeURIComponent(slug)}`);
  if (!campaign) return children;
  const remote = campaign.locationType === "REMOTE" || campaign.locationType === "GLOBAL";
  return <><JsonLd data={{ "@context": "https://schema.org", "@type": "JobPosting", title: campaign.title, description: campaign.fullDescription || campaign.shortDescription, identifier: { "@type": "PropertyValue", name: "Rivera", value: campaign.id }, datePosted: campaign.publishedAt, validThrough: campaign.applicationDeadline, employmentType: "CONTRACTOR", hiringOrganization: { "@type": "Organization", name: campaign.business.name, sameAs: absoluteUrl(`/businesses/${campaign.business.slug}`), logo: campaign.business.logoUrl }, jobLocationType: remote ? "TELECOMMUTE" : undefined, applicantLocationRequirements: campaign.creatorLocations.map((item) => ({ "@type": "Country", name: item.countryCode })), baseSalary: campaign.budgetMinMinor != null && campaign.budgetVisibility !== "HIDDEN" ? { "@type": "MonetaryAmount", currency: campaign.currencyCode, value: { "@type": "QuantitativeValue", minValue: campaign.budgetMinMinor / 100, maxValue: (campaign.budgetMaxMinor ?? campaign.budgetMinMinor) / 100, unitText: "PROJECT" } } : undefined, url: absoluteUrl(`/campaigns/${campaign.slug}`) }} />{children}</>;
}
