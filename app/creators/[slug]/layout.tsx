import { JsonLd } from "@/components/rivera/json-ld";
import { publicApi } from "@/lib/api";
import { absoluteUrl } from "@/lib/seo";

type Creator = {
  slug: string;
  displayName: string;
  headline: string;
  bio: string;
  city: string;
  countryCode: string;
  profileImageUrl?: string;
  categories: { name: string }[];
  socialAccounts: { profileUrl?: string }[];
};

export default async function CreatorProfileLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const creator = await publicApi<Creator>(`/creators/${encodeURIComponent(slug)}`);
  if (!creator) return children;
  const url = absoluteUrl(`/creators/${creator.slug}`);
  return <><JsonLd data={{ "@context": "https://schema.org", "@type": "Person", "@id": `${url}#creator`, name: creator.displayName, url, image: creator.profileImageUrl, description: creator.bio, jobTitle: creator.headline, address: { "@type": "PostalAddress", addressLocality: creator.city, addressCountry: creator.countryCode }, knowsAbout: creator.categories.map((item) => item.name), sameAs: creator.socialAccounts.map((item) => item.profileUrl).filter(Boolean) }} />{children}</>;
}
