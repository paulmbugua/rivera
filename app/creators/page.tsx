import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { JsonLd } from "@/components/rivera/json-ld";
import { publicApi } from "@/lib/api";
import { absoluteUrl, SOCIAL_IMAGE } from "@/lib/seo";

type Creator = {
  slug: string;
  displayName: string;
  headline: string;
  countryCode: string;
  city: string;
  profileImageUrl?: string;
  verificationStatus: string;
  combinedFollowers: number;
  categories: { name: string; slug: string; isPrimary: boolean }[];
  socialAccounts: { platform: string; isPrimary: boolean }[];
};

type Result = {
  items: Creator[];
  pagination: { page: number; pages: number; total: number };
};

const description =
  "Discover marketplace-ready creators by category, country and platform. Compare profiles, audiences and verified collaboration reviews.";

export const metadata: Metadata = {
  title: "Find Creators",
  description,
  alternates: { canonical: "/creators" },
  openGraph: {
    type: "website",
    title: "Find Creators | Rivera",
    description,
    url: "/creators",
    images: [SOCIAL_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "Find Creators | Rivera",
    description,
    images: [SOCIAL_IMAGE],
  },
};

export default async function CreatorsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const query = await searchParams;
  const params = new URLSearchParams();
  const filterKeys = ["q", "country", "category", "platform", "verified", "page", "sort"];
  for (const key of filterKeys) if (query[key]) params.set(key, query[key]!);

  const result = await publicApi<Result>(`/creators?${params}`);
  const creators = result?.items ?? [];
  const hasFilters = filterKeys.some((key) => key !== "page" && key !== "sort" && Boolean(query[key]));

  return (
    <main className="directory-shell">
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "@id": absoluteUrl("/creators#directory"),
        name: "Rivera creator directory",
        description,
        url: absoluteUrl("/creators"),
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: result?.pagination.total ?? 0,
          itemListElement: creators.map((creator, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: creator.displayName,
            url: absoluteUrl(`/creators/${creator.slug}`),
          })),
        },
      }} />

      <header className="directory-header">
        <Link href="/" className="brand"><span className="brand-mark">R.</span>rivera</Link>
        <div>
          <p className="eyebrow">CREATOR DIRECTORY</p>
          <h1>Find the right voice.</h1>
          <p>Explore marketplace-ready creator profiles by location, platform and specialty. Compare relevant signals before starting a considered collaboration.</p>
        </div>
      </header>

      <section className="directory-intro" aria-labelledby="creator-directory-guide">
        <div>
          <p className="eyebrow">DISCOVERY WITH CONTEXT</p>
          <h2 id="creator-directory-guide">Meet creators who fit the story—not just the brief.</h2>
          <p>Rivera gives businesses a clearer view of each creator’s work, audience and collaboration history. Public profiles show creator-provided audience figures and identify verification where it is available.</p>
        </div>
        <div className="directory-guide-grid">
          <article><strong>Search with intent</strong><span>Explore by country, platform and creative category.</span></article>
          <article><strong>Compare the fit</strong><span>Review portfolios, audience context and past collaboration feedback.</span></article>
          <article><strong>Build trust early</strong><span>Use clear campaign requirements and Rivera’s structured workflow.</span></article>
        </div>
      </section>

      <form className="directory-filters" aria-label="Filter creators">
        <label>Search<input name="q" defaultValue={query.q} placeholder="Name, headline or city" /></label>
        <label>Country<input name="country" defaultValue={query.country} maxLength={2} placeholder="KE" /></label>
        <label>Platform<select name="platform" defaultValue={query.platform ?? ""}><option value="">All platforms</option>{["INSTAGRAM", "TIKTOK", "YOUTUBE", "FACEBOOK", "X", "LINKEDIN", "TWITCH", "PODCAST"].map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Sort<select name="sort" defaultValue={query.sort ?? "newest"}><option value="newest">Newest</option><option value="name">Name</option><option value="followers">Followers</option></select></label>
        <button className="button primary">Apply filters</button>
      </form>

      {creators.length ? (
        <>
          <div className="creator-directory">
            {creators.map((creator) => (
              <article className="creator-card" key={creator.slug}>
                <div className="creator-card-photo">
                  {creator.profileImageUrl ? <Image unoptimized width={360} height={220} src={creator.profileImageUrl} alt={`${creator.displayName} creator profile`} /> : <span>{creator.displayName.slice(0, 1)}</span>}
                </div>
                <div className="creator-card-copy">
                  <p className="creator-location">{creator.city}, {creator.countryCode}</p>
                  <h2>{creator.displayName}{creator.verificationStatus === "VERIFIED" && <span title="Verified by Rivera"> ✓</span>}</h2>
                  <p>{creator.headline}</p>
                  <div className="tag-row">{creator.categories.slice(0, 3).map((item) => <span key={item.slug}>{item.name}</span>)}</div>
                  <p><strong>{new Intl.NumberFormat("en", { notation: "compact" }).format(creator.combinedFollowers)}</strong> combined followers</p>
                  <Link href={`/creators/${creator.slug}`}>View profile →</Link>
                </div>
              </article>
            ))}
          </div>
          <nav className="directory-pages" aria-label="Directory pagination">
            <span>{result!.pagination.total} creators</span>
            {result!.pagination.page > 1 && <Link href={`?${new URLSearchParams({ ...query, page: String(result!.pagination.page - 1) } as Record<string, string>)}`}>Previous</Link>}
            {result!.pagination.page < result!.pagination.pages && <Link href={`?${new URLSearchParams({ ...query, page: String(result!.pagination.page + 1) } as Record<string, string>)}`}>Next</Link>}
          </nav>
        </>
      ) : hasFilters ? (
        <div className="dashboard-empty">
          <h2>No close matches yet.</h2>
          <p>Clear a filter to explore the full creator community.</p>
          <Link className="text-link" href="/creators">View all creators →</Link>
        </div>
      ) : (
        <div className="dashboard-empty directory-welcome">
          <h2>The Rivera creator community is opening.</h2>
          <p>New public creator profiles will appear here as they complete marketplace onboarding. Creators can build a thoughtful profile now, while businesses can prepare their first campaign.</p>
          <div className="directory-actions"><Link className="button primary" href="/register">Join Rivera</Link><Link className="button secondary" href="/campaigns">Explore campaigns</Link></div>
        </div>
      )}
    </main>
  );
}
