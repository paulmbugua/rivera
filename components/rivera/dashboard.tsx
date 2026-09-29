"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Protected } from "./protected";
import { useAuth } from "./auth-provider";
import { api } from "@/lib/api";
type Summary = {
  slug: string;
  profileCompletion: number;
  profileVisibility: string;
  verificationStatus: string;
  combinedFollowers?: number;
  socialAccounts?: unknown[];
  portfolio?: unknown[];
};
type MarketSummary = {
  activeCampaigns?: number;
  draftCampaigns?: number;
  closedCampaigns?: number;
  campaignViews?: number;
  savedOpportunities?: number;
  newestOpportunities?: number;
  recommendedOpportunities?: number;
  applicationsReceived?: number;
  applicationsViewed?: number;
  applicationsSubmitted?: number;
  draftApplications?: number;
  freeApplicationCredits?: number;
  applicationsShortlisted?: number;
  offersSent?: number;
  creatorsHired?: number;
  offersReceived?: number;
  activeCollaborations?: number;
  completedCollaborations?: number;
  awaitingReview?: number;
  revisionsRequested?: number;
  reviewsPending?: number;
};
export function Dashboard({
  role,
}: {
  role: "BUSINESS" | "CREATOR" | "ADMIN";
}) {
  return (
    <Protected role={role} onboarding={role === "ADMIN" ? undefined : true}>
      <Inner role={role} />
    </Protected>
  );
}
function Inner({ role }: { role: "BUSINESS" | "CREATOR" | "ADMIN" }) {
  const { user, logout } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [market, setMarket] = useState<MarketSummary>({});
  useEffect(() => {
    if (role !== "ADMIN") {
      api<Summary>(
        role === "CREATOR" ? "/creators/me/profile" : "/businesses/me/profile",
      )
        .then(setSummary)
        .catch(() => {});
      Promise.all([
        api<MarketSummary>(
          role === "CREATOR"
            ? "/creator/campaigns/summary/dashboard"
            : "/business/campaigns/summary/dashboard",
        ),
        api<MarketSummary>(
          role === "CREATOR"
            ? "/creators/me/applications/summary"
            : "/business/applications/summary",
        ),
        api<MarketSummary>(
          role === "CREATOR"
            ? "/creators/me/workspace-summary"
            : "/business/workspace-summary",
        ),
      ])
        .then(([campaigns, applications, workspaces]) =>
          setMarket({ ...campaigns, ...applications, ...workspaces }),
        )
        .catch(() => {});
    }
  }, [role]);
  const links =
    role === "ADMIN"
      ? [
          ["Overview", "/admin"],
          ["Reports", "/admin/reports"],
          ["Support", "/admin/support"],
          ["Analytics", "/admin/analytics"],
          ["Data Requests", "/admin/data-requests"],
          ["Creators", "/admin/creators"],
          ["Businesses", "/admin/businesses"],
          ["Campaigns", "/admin/campaigns"],
          ["Applications", "/admin/applications"],
          ["Reviews", "/admin/reviews"],
          ["Application Fees", "/admin/application-fees"],
          ["Application Payments", "/admin/payments"],
          ["Collaboration Payments", "/admin/collaboration-payments"],
          ["Transfers", "/admin/transfers"],
          ["Refunds", "/admin/refunds"],
          ["Payment Issues", "/admin/payment-issues"],
          ["Payout Accounts", "/admin/payout-accounts"],
          ["Verifications", "/admin/verifications"],
          ["Categories", "/admin/categories"],
          ["Industries", "/admin/industries"],
        ]
      : role === "BUSINESS"
        ? [
            ["Overview", "/dashboard/business"],
            ["Campaigns", "/dashboard/business/campaigns"],
            ["Messages", "/dashboard/business/messages"],
            ["Payments", "/dashboard/business/payments"],
            ["Create Campaign", "/dashboard/business/campaigns/new"],
            ["Profile", "/dashboard/business/profile"],
            ["Find Creators", "/creators"],
            ["Settings", "/settings"],
          ]
        : [
            ["Overview", "/dashboard/creator"],
            ["Opportunities", "/dashboard/creator/opportunities"],
            ["Recommended", "/dashboard/creator/opportunities/recommended"],
            ["Saved", "/dashboard/creator/saved-campaigns"],
            ["Applications", "/dashboard/creator/applications"],
            ["Offers", "/dashboard/creator/offers"],
            ["Messages", "/dashboard/creator/messages"],
            ["Collaborations", "/dashboard/creator/collaborations"],
            ["Earnings", "/dashboard/creator/earnings"],
            ["Payouts", "/dashboard/creator/payouts"],
            ["Application Fee Payments", "/dashboard/creator/payments"],
            ["Profile", "/dashboard/creator/profile"],
            ["Settings", "/settings"],
          ];
  const businessStats: [string, number | undefined][] = [
    ["Active campaigns", market.activeCampaigns],
    ["Awaiting review", market.awaitingReview],
    ["Revisions requested", market.revisionsRequested],
    ["Reviews pending", market.reviewsPending],
    ["Creators hired", market.creatorsHired],
    ["Campaign views", market.campaignViews],
  ];
  const creatorStats: [string, number | undefined][] = [
    ["Applications submitted", market.applicationsSubmitted],
    ["Awaiting review", market.awaitingReview],
    ["Revisions requested", market.revisionsRequested],
    ["Completed", market.completedCollaborations],
    ["Reviews pending", market.reviewsPending],
    ["Active collaborations", market.activeCollaborations],
  ];
  return (
    <main className="dashboard-shell">
      <header>
        <Link href="/" className="brand">
          <span className="brand-mark">R.</span>rivera
        </Link>
        <nav>
          <Link href="/campaigns">Campaigns</Link>
          <Link href="/settings">Settings</Link>
          <button onClick={() => void logout()}>Log out</button>
        </nav>
      </header>
      <div className="dashboard-layout">
        <aside aria-label={`${role.toLowerCase()} navigation`}>
          {links.map(([text, href], index) => (
            <Link
              className={index === 0 ? "dashboard-nav-active" : ""}
              key={href}
              href={href}
            >
              {text}
            </Link>
          ))}
        </aside>
        <section>
          <p className="eyebrow">{role} DASHBOARD</p>
          <h1>Welcome, {user?.firstName}.</h1>
          {role === "ADMIN" ? (
            <>
              <p>
                Manage marketplace identities, campaigns, taxonomies and
                verification requests.
              </p>
              <div className="dashboard-empty">
                <h2>Marketplace administration</h2>
                <p>
                  Campaign inspection and Phase 3 controls are ready in the
                  navigation.
                </p>
              </div>
            </>
          ) : (
            <>
              <p>
                {role === "BUSINESS"
                  ? "Create clear opportunities and find the right Creator partners."
                  : "Discover opportunities that match your profile and save the strongest fits."}
              </p>
              <div className="dashboard-stats">
                <article>
                  <strong>{summary?.profileCompletion ?? 0}%</strong>
                  <span>Profile completion</span>
                </article>
                <article>
                  <strong>{summary?.profileVisibility ?? "PRIVATE"}</strong>
                  <span>Visibility</span>
                </article>
                <article>
                  <strong>{summary?.verificationStatus ?? "UNVERIFIED"}</strong>
                  <span>Verification</span>
                </article>
                {(role === "BUSINESS" ? businessStats : creatorStats).map(
                  ([text, value]) => (
                    <article key={text}>
                      <strong>{value ?? 0}</strong>
                      <span>{text}</span>
                    </article>
                  ),
                )}
              </div>
              <div className="dashboard-actions">
                <Link
                  className="button primary"
                  href={
                    role === "BUSINESS"
                      ? "/dashboard/business/campaigns/new"
                      : "/dashboard/creator/opportunities"
                  }
                >
                  {role === "BUSINESS"
                    ? "Create campaign"
                    : "Browse opportunities"}
                </Link>
                <Link
                  className="button secondary"
                  href={`/dashboard/${role.toLowerCase()}/profile`}
                >
                  Edit profile
                </Link>
                {summary?.slug && (
                  <Link
                    className="button secondary"
                    href={`/${role === "CREATOR" ? "creators" : "businesses"}/${summary.slug}`}
                  >
                    Preview profile
                  </Link>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
