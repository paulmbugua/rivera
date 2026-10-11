import { JsonLd } from "@/components/rivera/json-ld";
import { publicApi } from "@/lib/api";
import { absoluteUrl } from "@/lib/seo";

type Business = { slug: string; businessName: string; description: string; city: string; countryCode: string; logoUrl?: string; website?: string; yearEstablished?: number };

export default async function BusinessProfileLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const business = await publicApi<Business>(`/businesses/${encodeURIComponent(slug)}`);
  if (!business) return children;
  const url = absoluteUrl(`/businesses/${business.slug}`);
  return <><JsonLd data={{ "@context": "https://schema.org", "@type": "Organization", "@id": `${url}#business`, name: business.businessName, url, logo: business.logoUrl, description: business.description, foundingDate: business.yearEstablished ? String(business.yearEstablished) : undefined, address: { "@type": "PostalAddress", addressLocality: business.city, addressCountry: business.countryCode }, sameAs: business.website ? [business.website] : undefined }} />{children}</>;
}
