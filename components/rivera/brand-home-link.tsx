"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";

import { destination } from "@/lib/api";
import { useAuth } from "./auth-provider";

export function BrandHomeLink() {
  const { user, loading, refresh } = useAuth();
  const router = useRouter();
  const href = user ? destination(user) : "/";

  async function followBrand(event: MouseEvent<HTMLAnchorElement>) {
    if (!loading) return;
    event.preventDefault();
    const currentUser = await refresh();
    router.push(currentUser ? destination(currentUser) : "/");
  }

  return (
    <Link href={href} className="brand" aria-label={user ? "Return to your Rivera dashboard" : "Rivera home"} prefetch={false} onClick={(event) => void followBrand(event)}>
      <span className="brand-mark">R.</span>
      rivera
    </Link>
  );
}
