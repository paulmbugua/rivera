"use client";

import { Bookmark, Check } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import { useAuth } from "./auth-provider";

export function SelectCreatorButton({
  slug,
  displayName,
}: {
  slug: string;
  displayName: string;
}) {
  const { user, loading } = useAuth();
  const [selected, setSelected] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const isBusiness = user?.roles.includes("BUSINESS") ?? false;

  useEffect(() => {
    if (!isBusiness) return;
    let active = true;
    api<{ selected: boolean }>(
      `/businesses/me/selected-creators/${encodeURIComponent(slug)}/status`,
    )
      .then((result) => active && setSelected(result.selected))
      .catch(() => active && setError("Could not load your selection."));
    return () => {
      active = false;
    };
  }, [isBusiness, slug]);

  if (loading || !isBusiness) return null;

  async function toggle() {
    if (selected === null || busy) return;
    const next = !selected;
    setBusy(true);
    setError("");
    setSelected(next);
    try {
      const result = await api<{ selected: boolean }>(
        `/businesses/me/selected-creators/${encodeURIComponent(slug)}`,
        { method: next ? "POST" : "DELETE" },
      );
      setSelected(result.selected);
    } catch {
      setSelected(!next);
      setError("Selection was not saved. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="select-creator-control">
      <button
        className={`button profile-select-button${selected ? " selected" : ""}`}
        type="button"
        aria-pressed={selected ?? false}
        disabled={selected === null || busy}
        onClick={() => void toggle()}
      >
        {selected ? <Check size={17} aria-hidden="true" /> : <Bookmark size={17} aria-hidden="true" />}
        <span>{busy ? "Saving…" : selected ? "Creator selected" : "Select creator"}</span>
      </button>
      {selected && <Link href="/dashboard/business/creators">View selected creators</Link>}
      {error && <small role="status">{error}</small>}
      <span className="sr-only">Select {displayName} for your business shortlist.</span>
    </div>
  );
}
