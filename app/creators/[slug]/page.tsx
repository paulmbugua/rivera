import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BrandHomeLink } from "@/components/rivera/brand-home-link";
import { SelectCreatorButton } from "@/components/rivera/select-creator-button";
import { ShareProfile } from "@/components/rivera/share-profile";
import { publicApi } from "@/lib/api";
import { SOCIAL_IMAGE } from "@/lib/seo";

type Creator = {
  slug: string; displayName: string; headline: string; bio: string; countryCode: string; city: string;
  profileImageUrl?: string; coverImageUrl?: string; websiteUrl?: string; yearsExperience?: number;
  verificationStatus: string; combinedFollowers: number;
  categories: { name: string; slug: string }[]; contentTypes: { name: string; slug: string }[];
  languages: { languageCode: string }[];
  socialAccounts: { id: string; platform: string; username?: string; profileUrl?: string; followers: number; verifiedByRivera: boolean; isPrimary: boolean }[];
  portfolio: { id: string; title: string; description?: string; mediaType: string; mediaUrl?: string; thumbnailUrl?: string; externalUrl?: string; brandName?: string }[];
};
type Reviews = { averageRating: string; ratingCount: number; items: { id: string; rating: number; comment?: string; createdAt: string; reviewer: { name: string }; campaign: { title: string } }[] };
const creator = (slug: string) => publicApi<Creator>(`/creators/${encodeURIComponent(slug)}`);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const profile = await creator(slug);
  return profile ? {
    title: `${profile.displayName} — ${profile.headline}`,
    description: profile.bio.slice(0, 155),
    alternates:{canonical:`/creators/${profile.slug}`},
    openGraph: { type: "profile", title: `${profile.displayName} — ${profile.headline}`, description: profile.bio.slice(0, 155), url: `/creators/${profile.slug}`, images: [profile.profileImageUrl || SOCIAL_IMAGE] },
    twitter: { card: "summary_large_image", title: `${profile.displayName} on Rivera`, description: profile.bio.slice(0, 155), images: [profile.profileImageUrl || SOCIAL_IMAGE] },
  } : { title: "Creator not found", robots:{index:false,follow:false} };
}

export default async function CreatorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [profile, reviews] = await Promise.all([creator(slug), publicApi<Reviews>(`/creators/${encodeURIComponent(slug)}/reviews`)]);
  if (!profile) notFound();
  const primary = profile.socialAccounts.find((account) => account.isPrimary);

  return (
    <main className="public-profile">
      <nav><BrandHomeLink /><Link href="/creators">Find creators</Link></nav>
      <header className="profile-hero" style={profile.coverImageUrl ? { backgroundImage: `url(${profile.coverImageUrl})` } : undefined}>
        <div className="profile-hero-scrim" aria-hidden="true" />
        <div className="profile-hero-content">
          <div className="public-avatar">{profile.profileImageUrl ? <Image unoptimized width={150} height={150} src={profile.profileImageUrl} alt={`${profile.displayName} profile`} /> : profile.displayName[0]}</div>
          <div className="profile-hero-copy">
            <p className="creator-location">{profile.city}, {profile.countryCode}</p>
            <h1>{profile.displayName}{profile.verificationStatus === "VERIFIED" && <span title="Verified by Rivera"> ✓</span>}</h1>
            <h2>{profile.headline}</h2>
            <div className="profile-hero-signals">
              {primary && <span>{primary.platform} · {new Intl.NumberFormat("en", { notation: "compact" }).format(primary.followers)} followers</span>}
              <span aria-label={`${reviews?.averageRating ?? 0} out of 5 stars`}>★ {reviews?.averageRating ?? "0.00"} · {reviews?.ratingCount ?? 0} verified collaboration reviews</span>
            </div>
            <div className="tag-row">{profile.categories.map((category) => <span key={category.slug}>{category.name}</span>)}</div>
          </div>
          <div className="profile-hero-actions"><SelectCreatorButton slug={profile.slug} displayName={profile.displayName} /><ShareProfile title={`${profile.displayName} on Rivera`} /></div>
        </div>
      </header>
      <div className="public-profile-grid">
        <div>
          <section><p className="eyebrow">ABOUT</p><p className="profile-bio">{profile.bio}</p>{profile.websiteUrl && <a href={profile.websiteUrl} target="_blank" rel="noopener noreferrer">Visit website ↗</a>}</section>
          <section><p className="eyebrow">CONTENT</p><div className="tag-row">{profile.contentTypes.map((content) => <span key={content.slug}>{content.name}</span>)}</div></section>
          {profile.portfolio.length > 0 && <section><p className="eyebrow">PORTFOLIO</p><div className="public-portfolio">{profile.portfolio.map((item) => <a key={item.id} href={item.externalUrl || item.mediaUrl} target="_blank" rel="noopener noreferrer"><div>{item.thumbnailUrl ? <Image unoptimized width={300} height={110} src={item.thumbnailUrl} alt="" /> : <span>{item.mediaType.replace("_", " ")}</span>}</div><strong>{item.title}</strong><p>{item.brandName || item.description}</p></a>)}</div></section>}
          <section><p className="eyebrow">REVIEWS</p>{reviews?.items.length ? reviews.items.map((review) => <article key={review.id} className="stat-card"><strong>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</strong><p>{review.comment || "Rating submitted without a comment."}</p><small>{review.reviewer.name} · {review.campaign.title} · {new Date(review.createdAt).toLocaleDateString()}</small></article>) : <p>No completed-collaboration reviews yet.</p>}</section>
        </div>
        <aside>
          <div className="stat-card"><strong>{new Intl.NumberFormat("en", { notation: "compact" }).format(profile.combinedFollowers)}</strong><span>Combined followers</span></div>
          {profile.yearsExperience != null && <div className="stat-card"><strong>{profile.yearsExperience}</strong><span>Years experience</span></div>}
          <section><p className="eyebrow">SOCIAL ACCOUNTS</p>{profile.socialAccounts.map((account) => <a className="social-row" key={account.id} href={account.profileUrl} target="_blank" rel="noopener noreferrer"><span><strong>{account.platform}</strong><small>{account.username}</small></span><span>{new Intl.NumberFormat("en", { notation: "compact" }).format(account.followers)}{account.verifiedByRivera && " ✓"}</span></a>)}</section>
          <section><p className="eyebrow">LANGUAGES</p><p>{profile.languages.map((language) => language.languageCode.toUpperCase()).join(" · ")}</p></section>
        </aside>
      </div>
    </main>
  );
}
