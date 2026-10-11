import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="legal-page">
      <Link href="/" className="brand"><span className="brand-mark">R.</span>rivera</Link>
      <p className="eyebrow">404</p>
      <h1>This page has moved on.</h1>
      <p>The address may be outdated, or the opportunity may no longer be public.</p>
      <Link href="/" className="button primary">Return home</Link>
    </main>
  );
}
