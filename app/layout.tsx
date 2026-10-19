import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./product-scale.css";
import { AuthProvider } from "@/components/rivera/auth-provider";
import { ThemeProvider } from "@/components/rivera/theme-provider";
import {
  absoluteUrl,
  serializeJsonLd,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
  SOCIAL_IMAGE,
} from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Rivera | Creator Marketplace for Brands and Creators",
    template: "%s | Rivera",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: "Rivera", url: SITE_URL }],
  creator: "Rivera",
  publisher: "Rivera",
  category: "Creator marketplace",
  keywords: [
    "creator marketplace",
    "influencer marketing",
    "brand creator partnerships",
    "creator campaigns",
    "content creators",
    "UGC creators",
    "African creators",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: SITE_NAME,
    title: "Rivera | Where brands meet creators",
    description: SITE_DESCRIPTION,
    images: [{ url: SOCIAL_IMAGE, width: 1024, height: 500, alt: "Rivera — where brands meet creators" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rivera | Where brands meet creators",
    description: SITE_DESCRIPTION,
    images: [SOCIAL_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/images/rivera-notification.png",
  },
  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? { google: process.env.GOOGLE_SITE_VERIFICATION }
    : undefined,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f5ef" },
    { media: "(prefers-color-scheme: dark)", color: "#071b16" },
  ],
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": absoluteUrl("/#organization"),
  name: SITE_NAME,
  url: SITE_URL,
  logo: absoluteUrl("/images/rivera-notification.png"),
  description: SITE_DESCRIPTION,
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": absoluteUrl("/#website"),
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  publisher: { "@id": absoluteUrl("/#organization") },
  inLanguage: "en",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(organizationJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(websiteJsonLd) }} />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
