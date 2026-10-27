"use client";

import { BookmarkX, ExternalLink } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { api } from "@/lib/api";

type SelectedCreator = {
  slug: string;
  displayName: string;
  headline: string;
  city: string;
  countryCode: string;
  profileImageUrl?: string;
  verificationStatus: string;
  combinedFollowers: number;
  selectedAt: string;
  categories: { name: string; slug: string }[];
};

export function SelectedCreators() {
  const [items, setItems] = useState<SelectedCreator[] | null>(null);
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState("");

  useEffect(() => {
    api<{ items: SelectedCreator[] }>("/businesses/me/selected-creators")
      .then((result) => setItems(result.items))
      .catch(() => setError("Selected creators could not be loaded. Try again."));
  }, []);

  async function remove(slug: string) {
    setRemoving(slug);
    setError("");
    try {
      await api(`/businesses/me/selected-creators/${encodeURIComponent(slug)}`, {
        method: "DELETE",
      });
      setItems((current) => current?.filter((item) => item.slug !== slug) ?? []);
    } catch {
      setError("That creator could not be removed. Try again.");
    } finally {
      setRemoving("");
    }
  }

  return (
    <main className="selected-creators-page">
      <header>
        <div>
          <Link href="/dashboard/business">← Dashboard</Link>
          <p className="eyebrow">YOUR SHORTLIST</p>
          <h1>Selected creators</h1>
          <p>Keep promising profiles together while you prepare the right campaign.</p>
        </div>
        <Link className="button primary" href="/creators">Find creators</Link>
      </header>
      {error && <p className="form-error" role="alert">{error}</p>}
      {items === null && !error ? <p>Loading your selected creators…</p> : items?.length ? (
        <div className="selected-creators-grid">
          {items.map((creator) => (
            <article key={creator.slug}>
              <div className="selected-creator-avatar">
                {creator.profileImageUrl ? (
                  <Image unoptimized width={96} height={96} src={creator.profileImageUrl} alt="" />
                ) : <span>{creator.displayName.slice(0, 1)}</span>}
              </div>
              <div className="selected-creator-copy">
                <p className="creator-location">{creator.city}, {creator.countryCode}</p>
                <h2>{creator.displayName}{creator.verificationStatus === "VERIFIED" && <span title="Verified by Rivera"> ✓</span>}</h2>
                <p>{creator.headline}</p>
                <div className="tag-row">{creator.categories.slice(0, 2).map((category) => <span key={category.slug}>{category.name}</span>)}</div>
                <small>{new Intl.NumberFormat("en", { notation: "compact" }).format(creator.combinedFollowers)} combined followers</small>
              </div>
              <div className="selected-creator-actions">
                <Link href={`/creators/${creator.slug}`}>View profile <ExternalLink size={14} aria-hidden="true" /></Link>
                <button type="button" disabled={removing === creator.slug} onClick={() => void remove(creator.slug)}><BookmarkX size={15} aria-hidden="true" />{removing === creator.slug ? "Removing…" : "Remove"}</button>
              </div>
            </article>
          ))}
        </div>
      ) : !error ? (
        <section className="dashboard-empty">
          <h2>No creators selected yet.</h2>
          <p>When a profile feels right, choose “Select creator” to keep it here.</p>
          <Link className="text-link" href="/creators">Explore creators →</Link>
        </section>
      ) : null}
    </main>
  );
}
