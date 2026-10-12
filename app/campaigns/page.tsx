import type { Metadata } from "next";
import Link from "next/link";

import { CampaignCard } from "@/components/rivera/campaign-card";
import { JsonLd } from "@/components/rivera/json-ld";
import { publicApi } from "@/lib/api";
import { CampaignResult, label, objectives, platforms } from "@/lib/campaigns";
import { absoluteUrl, SOCIAL_IMAGE } from "@/lib/seo";

const description =
  "Browse active creator campaigns by category, location, platform, objective, budget and deadline. Find your next paid brand collaboration.";

export const metadata: Metadata = {
  title: "Creator Campaign Opportunities",
  description,
  alternates: { canonical: "/campaigns" },
  openGraph: {
    type: "website",
    title: "Creator Campaign Opportunities | Rivera",
    description,
    url: "/campaigns",
    images: [SOCIAL_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "Creator Campaign Opportunities | Rivera",
    description,
    images: [SOCIAL_IMAGE],
  },
};

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const query = await searchParams;
  const params = new URLSearchParams();
  const filterKeys = ["q", "country", "city", "category", "platform", "objective", "locationType", "budgetMinMinor", "budgetMaxMinor", "closingBefore", "sort", "page"];
  for (const key of filterKeys) if (query[key]) params.set(key, query[key]!);

  const result = await publicApi<CampaignResult>(`/campaigns?${params}`);
  const campaigns = result?.items ?? [];
  const hasFilters = filterKeys.some((key) => key !== "page" && key !== "sort" && Boolean(query[key]));

  return (
    <main className="opportunity-shell public-opportunities">
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "@id": absoluteUrl("/campaigns#directory"),
        name: "Rivera creator campaign opportunities",
        description,
        url: absoluteUrl("/campaigns"),
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: result?.pagination.total ?? 0,
          itemListElement: campaigns.map((campaign, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: campaign.title,
            url: absoluteUrl(`/campaigns/${campaign.slug}`),
          })),
        },
      }} />

      <header>
        <Link href="/" className="brand"><span className="brand-mark">R.</span>rivera</Link>
        <p className="eyebrow">GLOBAL OPPORTUNITY MARKETPLACE</p>
        <h1>Campaigns worth creating for.</h1>
        <p>Discover clear collaboration opportunities from brands looking for original creator work.</p>
      </header>

      <section className="directory-intro" aria-labelledby="campaign-directory-guide">
        <div>
          <p className="eyebrow">CLEAR FROM THE START</p>
          <h2 id="campaign-directory-guide">Know the work, audience and terms before you apply.</h2>
          <p>Rivera brings campaign expectations into one place so creators can assess fit with confidence and businesses can attract thoughtful proposals.</p>
        </div>
        <div className="directory-guide-grid">
          <article><strong>Relevant opportunities</strong><span>Filter by platform, category, country and campaign objective.</span></article>
          <article><strong>Visible expectations</strong><span>Review deliverables, audience needs, deadlines and available budget.</span></article>
          <article><strong>A guided workflow</strong><span>Move from proposal to funded workspace, delivery and payment.</span></article>
        </div>
      </section>

      <form className="campaign-filter-grid" aria-label="Filter campaigns">
        <label>Search<input name="q" defaultValue={query.q} placeholder="Campaign or brand" /></label>
        <label>Country<input name="country" maxLength={2} placeholder="KE" defaultValue={query.country} /></label>
        <label>City<input name="city" defaultValue={query.city} /></label>
        <label>Category slug<input name="category" placeholder="technology" defaultValue={query.category} /></label>
        <label>Platform<select name="platform" defaultValue={query.platform ?? ""}><option value="">All platforms</option>{platforms.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Objective<select name="objective" defaultValue={query.objective ?? ""}><option value="">All objectives</option>{objectives.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label>
        <label>Location<select name="locationType" defaultValue={query.locationType ?? ""}><option value="">Any</option>{["LOCAL", "NATIONAL", "GLOBAL", "REMOTE"].map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Sort<select name="sort" defaultValue={query.sort ?? "newest"}><option value="newest">Newest</option><option value="deadline">Closing soon</option><option value="budget-high">Highest budget</option><option value="budget-low">Lowest budget</option></select></label>
        <button className="button primary">Apply filters</button>
      </form>

      {campaigns.length ? (
        <>
          <div className="campaign-grid">{campaigns.map((campaign) => <CampaignCard key={campaign.id} campaign={campaign} />)}</div>
          <nav className="directory-pages" aria-label="Campaign pagination">
            <span>{result!.pagination.total} active opportunities</span>
            {result!.pagination.page > 1 && <Link href={`?${new URLSearchParams({ ...query, page: String(result!.pagination.page - 1) } as Record<string, string>)}`}>Previous</Link>}
            {result!.pagination.page < result!.pagination.pages && <Link href={`?${new URLSearchParams({ ...query, page: String(result!.pagination.page + 1) } as Record<string, string>)}`}>Next</Link>}
          </nav>
        </>
      ) : hasFilters ? (
        <div className="dashboard-empty">
          <h2>No close matches yet.</h2>
          <p>Clear a filter to see every currently published opportunity.</p>
          <Link className="text-link" href="/campaigns">View all campaigns →</Link>
        </div>
      ) : (
        <div className="dashboard-empty directory-welcome">
          <h2>New creator opportunities are on the way.</h2>
          <p>Published campaigns will appear here with their requirements, deliverables and application deadlines. Join Rivera now to prepare your profile or create a campaign.</p>
          <div className="directory-actions"><Link className="button primary" href="/register">Join Rivera</Link><Link className="button secondary" href="/creators">Find creators</Link></div>
        </div>
      )}
    </main>
  );
}
