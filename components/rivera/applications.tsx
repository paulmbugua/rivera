"use client";
/* eslint-disable react-hooks/exhaustive-deps */
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import {
  Application,
  ApplicationResult,
  majorToMinor,
  money,
  statusLabel,
} from "@/lib/applications";
import { Campaign } from "@/lib/campaigns";
import { useAuth } from "./auth-provider";

const errorText = (error: unknown) =>
  error instanceof ApiError
    ? error.message
    : "Something went wrong. Please try again.";

export function ApplyCampaignCta({ campaignId }: { campaignId: string }) {
  const { user, loading } = useAuth();
  const [state, setState] = useState<{
    canApply: boolean;
    existingApplicationId?: string | null;
    blockingReasons: string[];
  } | null>(null);
  useEffect(() => {
    if (user?.roles.includes("CREATOR"))
      api<typeof state>(`/campaigns/${campaignId}/eligibility`)
        .then(setState)
        .catch(() => {});
  }, [campaignId, user?.id]);
  if (loading) return <p>Checking eligibility…</p>;
  if (!user)
    return (
      <Link className="button primary" href="/login">
        Sign in to apply
      </Link>
    );
  if (!user.roles.includes("CREATOR")) return null;
  if (state?.existingApplicationId)
    return (
      <Link
        className="button primary"
        href={`/dashboard/creator/applications/${state.existingApplicationId}`}
      >
        View your application
      </Link>
    );
  if (state && !state.canApply)
    return (
      <div>
        <button className="button primary" disabled>
          Submit Proposal
        </button>
        <p className="form-error">
          {state.blockingReasons.includes("CREATOR_PROFILE_INCOMPLETE")
            ? "Complete your Creator profile before applying."
            : "This Campaign is not accepting proposals."}
        </p>
      </div>
    );
  return (
    <Link
      className="button primary"
      href={`/dashboard/creator/campaigns/${campaignId}/apply`}
    >
      Submit Proposal
    </Link>
  );
}
export function UnlockedCampaignBrief({ campaignId }: { campaignId: string }) {
  const { user } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  useEffect(() => {
    if (user?.roles.includes("CREATOR"))
      api<Campaign>(`/creator/campaigns/${campaignId}/unlocked`)
        .then(setCampaign)
        .catch(() => {});
  }, [campaignId, user?.id]);
  if (!campaign)
    return (
      <p className="privacy-note">
        Full campaign details become available after a valid proposal
        submission. Private Business contact information remains protected.
      </p>
    );
  return (
    <section className="application-panel unlocked-brief">
      <p className="eyebrow">FULL CAMPAIGN BRIEF · UNLOCKED</p>
      <h2>Full description</h2>
      <p>{campaign.fullDescription}</p>
      <h3>Target audience</h3>
      <p>{campaign.targetAudience || "Not specified"}</p>
      <h3>Expected outcomes</h3>
      <p>{campaign.expectedOutcomes || "Not specified"}</p>
      <h3>Special instructions</h3>
      <p>{campaign.specialInstructions || "None"}</p>
      <p className="privacy-note">
        Submitting a proposal does not unlock phone, email, private address or
        direct messaging.
      </p>
    </section>
  );
}

type Review = {
  application: Application;
  fee: { amountMinor: number; currencyCode: string };
  freeApplicationCredits: number;
  warnings: string[];
  outsideBudget: boolean;
};
export function ProposalForm({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null),
    [applicationId, setApplicationId] = useState<string>(),
    [stage, setStage] = useState(1),
    [review, setReview] = useState<Review | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [form, setForm] = useState({
      proposedAmount: "",
      pitch: "",
      proposedDeliverables: "",
      estimatedDeliveryDays: "7",
      additionalNotes: "",
      feeConfirmed: false,
    });
  useEffect(() => {
    api<Campaign>(`/campaigns/${campaignId}`)
      .then(setCampaign)
      .catch((e) => setError(errorText(e)));
  }, [campaignId]);
  const payload = () => ({
    proposedAmountMinor: majorToMinor(
      Number(form.proposedAmount),
      campaign?.currencyCode ?? "USD",
    ),
    proposedCurrencyCode: campaign?.currencyCode ?? "USD",
    pitch: form.pitch,
    proposedDeliverables: form.proposedDeliverables || undefined,
    estimatedDeliveryDays: Number(form.estimatedDeliveryDays) || undefined,
    additionalNotes: form.additionalNotes || undefined,
  });
  async function save() {
    setBusy(true);
    setError("");
    try {
      const app = await api<Application>(
        applicationId
          ? `/creators/me/applications/${applicationId}`
          : `/campaigns/${campaignId}/applications/draft`,
        {
          method: applicationId ? "PATCH" : "POST",
          body: JSON.stringify(payload()),
        },
      );
      setApplicationId(app.id);
      return app;
    } catch (e) {
      setError(errorText(e));
      return null;
    } finally {
      setBusy(false);
    }
  }
  async function next() {
    const app = await save();
    if (!app) return;
    setBusy(true);
    try {
      const value = await api<Review>(
        `/creators/me/applications/${app.id}/review`,
        { method: "POST" },
      );
      setReview(value);
      setStage(2);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  async function submitCredit() {
    if (!applicationId) return;
    setBusy(true);
    try {
      await api(`/creators/me/applications/${applicationId}/use-credit`, {
        method: "POST",
      });
      router.push(
        `/dashboard/creator/applications/${applicationId}?submitted=credit`,
      );
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  }
  async function checkout() {
    if (!applicationId) return;
    setBusy(true);
    try {
      const value = await api<{ checkoutUrl?: string | null }>(
        `/creators/me/applications/${applicationId}/checkout`,
        { method: "POST" },
      );
      if (value.checkoutUrl) window.location.assign(value.checkoutUrl);
      else
        router.push(
          `/dashboard/creator/applications/${applicationId}?submitted=free`,
        );
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  }
  if (!campaign)
    return (
      <main className="application-shell">
        <p>{error || "Loading Campaign…"}</p>
      </main>
    );
  return (
    <main className="application-shell">
      <header>
        <Link href={`/campaigns/${campaign.slug}`}>← Campaign</Link>
        <p className="eyebrow">PROPOSAL · STEP {stage} OF 3</p>
        <h1>{campaign.title}</h1>
        <p>
          Set the amount you would like the Business to pay if you are hired.
          Rivera only charges the separate Application Fee shown before
          submission.
        </p>
      </header>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {stage === 1 && (
        <section className="application-panel">
          <h2>Create Proposal</h2>
          <div className="settings-grid">
            <label className="field">
              Your proposed price ({campaign.currencyCode})
              <input
                required
                min="0.01"
                step="0.01"
                type="number"
                value={form.proposedAmount}
                onChange={(e) =>
                  setForm({ ...form, proposedAmount: e.target.value })
                }
              />
            </label>
            <label className="field">
              Estimated delivery (days)
              <input
                min="1"
                max="365"
                type="number"
                value={form.estimatedDeliveryDays}
                onChange={(e) =>
                  setForm({ ...form, estimatedDeliveryDays: e.target.value })
                }
              />
            </label>
          </div>
          <label className="field">
            Why are you a good fit?
            <textarea
              required
              minLength={40}
              maxLength={1500}
              rows={7}
              value={form.pitch}
              onChange={(e) => setForm({ ...form, pitch: e.target.value })}
            />
            <small>
              Tell the Business about your audience, content style and approach.
            </small>
          </label>
          <label className="field">
            Proposed deliverables
            <textarea
              maxLength={3000}
              rows={5}
              value={form.proposedDeliverables}
              onChange={(e) =>
                setForm({ ...form, proposedDeliverables: e.target.value })
              }
            />
          </label>
          <label className="field">
            Additional notes
            <textarea
              maxLength={1500}
              rows={3}
              value={form.additionalNotes}
              onChange={(e) =>
                setForm({ ...form, additionalNotes: e.target.value })
              }
            />
          </label>
          <div className="dashboard-actions">
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => void save()}
            >
              {busy ? "Saving proposal…" : "Save draft"}
            </button>
            <button
              className="button primary"
              disabled={
                busy || !form.proposedAmount || form.pitch.trim().length < 40
              }
              onClick={() => void next()}
            >
              Review Proposal
            </button>
          </div>
        </section>
      )}
      {stage === 2 && review && (
        <section className="application-panel proposal-review">
          <h2>Review Proposal & Rivera Fee</h2>
          <dl>
            <dt>Campaign</dt>
            <dd>{campaign.title}</dd>
            <dt>My Proposal Price</dt>
            <dd>
              {money(
                review.application.proposedAmountMinor,
                review.application.proposedCurrencyCode,
              )}
            </dd>
            <dt>Estimated delivery</dt>
            <dd>
              {review.application.estimatedDeliveryDays
                ? `${review.application.estimatedDeliveryDays} days`
                : "Not specified"}
            </dd>
            <dt>Rivera Application Fee</dt>
            <dd>{money(review.fee.amountMinor, review.fee.currencyCode)}</dd>
            <dt>Total charged today</dt>
            <dd>{money(review.fee.amountMinor, review.fee.currencyCode)}</dd>
          </dl>
          {review.outsideBudget && (
            <p className="form-warning">
              Your proposed price is outside the Business’s stated budget range.
              You may still submit it.
            </p>
          )}
          <div className="fee-disclosure">
            <strong>
              Paying the Rivera Application Fee submits your proposal. It does
              not guarantee selection or hiring.
            </strong>
            <p>
              Your proposed campaign price is not charged by Rivera at this
              stage. Voluntary withdrawals are generally non-refundable.
            </p>
            <Link href="/terms#application-fees">Application Fee Policy</Link>
          </div>
          <label className="check-line">
            <input
              type="checkbox"
              checked={form.feeConfirmed}
              onChange={(e) =>
                setForm({ ...form, feeConfirmed: e.target.checked })
              }
            />{" "}
            I understand the proposal price and Rivera Application Fee are
            separate.
          </label>
          <div className="dashboard-actions">
            <button className="button secondary" onClick={() => setStage(1)}>
              Edit proposal
            </button>
            {review.freeApplicationCredits > 0 ? (
              <button
                className="button primary"
                disabled={!form.feeConfirmed || busy}
                onClick={() => void submitCredit()}
              >
                {busy
                  ? "Submitting application…"
                  : `Use 1 free credit (${review.freeApplicationCredits} available)`}
              </button>
            ) : review.fee.amountMinor === 0 ? (
              <button
                className="button primary"
                disabled={!form.feeConfirmed || busy}
                onClick={() => void checkout()}
              >
                Submit free application
              </button>
            ) : (
              <button
                className="button primary"
                disabled={!form.feeConfirmed || busy}
                onClick={() => void checkout()}
              >
                {busy
                  ? "Preparing payment…"
                  : `Pay ${money(review.fee.amountMinor, review.fee.currencyCode)} securely`}
              </button>
            )}
          </div>
        </section>
      )}
    </main>
  );
}

export function CreatorApplications() {
  const [result, setResult] = useState<ApplicationResult | null>(null),
    [status, setStatus] = useState(""),
    [error, setError] = useState("");
  const load = () =>
    api<ApplicationResult>(
      `/creators/me/applications${status ? `?status=${status}` : ""}`,
    )
      .then(setResult)
      .catch((e) => setError(errorText(e)));
  useEffect(() => {
    void load();
  }, [status]);
  return (
    <main className="application-shell">
      <header>
        <Link href="/dashboard/creator">← Dashboard</Link>
        <p className="eyebrow">MY APPLICATIONS</p>
        <h1>Proposals and applications</h1>
        <p>
          Draft proposals remain private. Businesses only see proposals after a
          verified payment, free credit or zero-fee submission.
        </p>
      </header>
      <label className="field status-filter">
        Status
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All</option>
          {[
            "DRAFT",
            "AWAITING_PAYMENT",
            "SUBMITTED",
            "VIEWED",
            "WITHDRAWN",
          ].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </label>
      {error && <p className="form-error">{error}</p>}
      <div className="application-list">
        {result?.items.map((app) => (
          <ApplicationCard key={app.id} app={app} />
        ))}
      </div>
      {result && !result.items.length && (
        <div className="dashboard-empty">
          <h2>No applications in this view.</h2>
          <Link href="/dashboard/creator/opportunities">
            Browse opportunities
          </Link>
        </div>
      )}
    </main>
  );
}
function ApplicationCard({
  app,
  business = false,
  campaignId,
}: {
  app: Application;
  business?: boolean;
  campaignId?: string;
}) {
  return (
    <article className="application-card">
      <div>
        <p className="eyebrow">
          {statusLabel(app.status)} ·{" "}
          {business ? "PROPOSAL" : statusLabel(app.paymentStatus)}
        </p>
        <h2>{business ? app.creator?.displayName : app.campaign.title}</h2>
        <p>{business ? app.pitch : app.campaign.business.name}</p>
        <div className="campaign-facts">
          <span>
            {money(app.proposedAmountMinor, app.proposedCurrencyCode)} proposal
          </span>
          {app.estimatedDeliveryDays && (
            <span>{app.estimatedDeliveryDays} days</span>
          )}
          <span>
            {app.submittedAt
              ? new Date(app.submittedAt).toLocaleDateString()
              : "Draft saved"}
          </span>
        </div>
      </div>
      <Link
        href={
          business
            ? `/dashboard/business/campaigns/${campaignId}/applications/${app.id}`
            : `/dashboard/creator/applications/${app.id}`
        }
      >
        {business ? "View Proposal" : "View Application"} →
      </Link>
    </article>
  );
}

export function CreatorApplicationDetail({ id }: { id: string }) {
  const search = useSearchParams()!;
  const [app, setApp] = useState<Application | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const load = (poll = false) =>
    api<Application>(
      `/creators/me/applications/${id}${poll ? "/payment-status" : ""}`,
    )
      .then(setApp)
      .catch((e) => setError(errorText(e)));
  useEffect(() => {
    void load(search.get("payment") === "success");
  }, [id]);
  useEffect(() => {
    if (search.get("payment") !== "success" || app?.status === "SUBMITTED")
      return;
    const timer = setInterval(() => void load(true), 2500);
    return () => clearInterval(timer);
  }, [app?.status]);
  async function withdraw() {
    if (
      !confirm(
        "Withdraw this proposal? The Rivera Application Fee or free credit will not automatically be returned.",
      )
    )
      return;
    setBusy(true);
    try {
      setApp(
        await api<Application>(`/creators/me/applications/${id}/withdraw`, {
          method: "POST",
        }),
      );
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  if (!app)
    return (
      <main className="application-shell">
        <p>{error || "Loading application…"}</p>
      </main>
    );
  const processing =
    search.get("payment") === "success" &&
    !["SUBMITTED", "VIEWED"].includes(app.status);
  return (
    <main className="application-shell">
      <header>
        <Link href="/dashboard/creator/applications">← Applications</Link>
        <p className="eyebrow">
          {statusLabel(app.status)} · {statusLabel(app.paymentStatus)}
        </p>
        <h1>{app.campaign.title}</h1>
        {processing && (
          <p role="status">
            Payment received. We’re confirming your application.
          </p>
        )}
        {search.get("submitted") && (
          <p className="form-success">
            Proposal submitted successfully
            {search.get("submitted") === "credit"
              ? " — 1 free application credit was used."
              : "."}
          </p>
        )}
      </header>
      <div className="application-detail-grid">
        <article className="application-panel">
          <h2>Your Proposal</h2>
          <dl>
            <dt>Proposal Price</dt>
            <dd>{money(app.proposedAmountMinor, app.proposedCurrencyCode)}</dd>
            <dt>Estimated delivery</dt>
            <dd>
              {app.estimatedDeliveryDays
                ? `${app.estimatedDeliveryDays} days`
                : "Not specified"}
            </dd>
            <dt>Rivera Application Fee</dt>
            <dd>
              {app.usedFreeCredit
                ? "Free credit used"
                : money(
                    app.applicationFeeMinor,
                    app.applicationFeeCurrencyCode,
                  )}
            </dd>
          </dl>
          <h3>Pitch</h3>
          <p>{app.pitch}</p>
          <h3>Proposed deliverables</h3>
          <p>{app.proposedDeliverables || "Not specified"}</p>
          {["SUBMITTED", "VIEWED"].includes(app.status) && (
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => void withdraw()}
            >
              Withdraw Application
            </button>
          )}
        </article>
        {["SUBMITTED", "VIEWED", "WITHDRAWN"].includes(app.status) && (
          <article className="application-panel unlocked-brief">
            <p className="eyebrow">FULL CAMPAIGN BRIEF</p>
            <h2>Unlocked Campaign details</h2>
            <p>{app.campaign.fullDescription}</p>
            <h3>Target audience</h3>
            <p>{app.campaign.targetAudience}</p>
            <h3>Expected outcomes</h3>
            <p>{app.campaign.expectedOutcomes}</p>
            <h3>Special instructions</h3>
            <p>{app.campaign.specialInstructions || "None"}</p>
            <p className="privacy-note">
              Private Business phone numbers, login email and address remain
              protected.
            </p>
          </article>
        )}
      </div>
    </main>
  );
}

export function BusinessApplications({ campaignId }: { campaignId: string }) {
  const [result, setResult] = useState<ApplicationResult | null>(null),
    [error, setError] = useState(""),
    [sort, setSort] = useState("newest"),
    [filters, setFilters] = useState({status:"",country:"",category:"",platform:"",verified:false});
  useEffect(() => {
    const query = new URLSearchParams({sort});
    if(filters.status)query.set("status",filters.status);
    if(filters.country)query.set("country",filters.country.toUpperCase());
    if(filters.category)query.set("category",filters.category.toLowerCase());
    if(filters.platform)query.set("platform",filters.platform);
    if(filters.verified)query.set("verified","true");
    api<ApplicationResult>(
      `/business/campaigns/${campaignId}/applications?${query}`,
    )
      .then(setResult)
      .catch((e) => setError(errorText(e)));
  }, [campaignId, sort, filters]);
  return (
    <main className="application-shell">
      <header>
        <Link href={`/dashboard/business/campaigns/${campaignId}`}>
          ← Campaign
        </Link>
        <p className="eyebrow">APPLICATIONS RECEIVED</p>
        <h1>Creator Proposals</h1>
        <p>
          Rivera fee and payment details are private between Rivera and each
          Creator.
        </p>
      </header>
      <div className="application-filters">
        <label className="field">Status<select value={filters.status} onChange={(e)=>setFilters({...filters,status:e.target.value})}><option value="">All submitted</option><option value="SUBMITTED">Submitted</option><option value="VIEWED">Viewed</option><option value="WITHDRAWN">Withdrawn</option></select></label>
        <label className="field">Creator country code<input maxLength={2} placeholder="QA" value={filters.country} onChange={(e)=>setFilters({...filters,country:e.target.value})}/></label>
        <label className="field">Category slug<input placeholder="technology" value={filters.category} onChange={(e)=>setFilters({...filters,category:e.target.value})}/></label>
        <label className="field">Platform<select value={filters.platform} onChange={(e)=>setFilters({...filters,platform:e.target.value})}><option value="">All platforms</option>{["INSTAGRAM","TIKTOK","YOUTUBE","FACEBOOK","X","LINKEDIN","SNAPCHAT","TWITCH","PINTEREST","BLOG","PODCAST","OTHER"].map((platform)=><option key={platform}>{platform}</option>)}</select></label>
        <label className="field">Sort<select value={sort} onChange={(e)=>setSort(e.target.value)}><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="price-low">Proposal price: low to high</option><option value="price-high">Proposal price: high to low</option></select></label>
        <label className="check-line"><input type="checkbox" checked={filters.verified} onChange={(e)=>setFilters({...filters,verified:e.target.checked})}/> Verified Creators only</label>
      </div>
      {error && <p className="form-error">{error}</p>}
      <div className="application-list">
        {result?.items.map((app) => (
          <ApplicationCard
            key={app.id}
            app={app}
            business
            campaignId={campaignId}
          />
        ))}
      </div>
      {result && !result.items.length && (
        <div className="dashboard-empty">
          <h2>No submitted proposals yet.</h2>
          <p>Draft and unpaid proposals never appear here.</p>
        </div>
      )}
    </main>
  );
}

export function BusinessApplicationDetail({
  campaignId,
  id,
}: {
  campaignId: string;
  id: string;
}) {
  const [app, setApp] = useState<Application | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    api<Application>(`/business/campaigns/${campaignId}/applications/${id}`)
      .then(setApp)
      .catch((e) => setError(errorText(e)));
  }, [campaignId, id]);
  if (!app)
    return (
      <main className="application-shell">
        <p>{error || "Loading Proposal…"}</p>
      </main>
    );
  return (
    <main className="application-shell">
      <header>
        <Link href={`/dashboard/business/campaigns/${campaignId}/applications`}>
          ← Applications
        </Link>
        <p className="eyebrow">{statusLabel(app.status)}</p>
        <h1>{app.creator?.displayName}</h1>
        <p>{app.creator?.headline}</p>
      </header>
      <div className="application-detail-grid">
        <article className="application-panel">
          <h2>Proposal</h2>
          <dl>
            <dt>Creator Proposal Price</dt>
            <dd>{money(app.proposedAmountMinor, app.proposedCurrencyCode)}</dd>
            <dt>Estimated delivery</dt>
            <dd>
              {app.estimatedDeliveryDays
                ? `${app.estimatedDeliveryDays} days`
                : "Not specified"}
            </dd>
            <dt>Submitted</dt>
            <dd>
              {app.submittedAt
                ? new Date(app.submittedAt).toLocaleString()
                : "—"}
            </dd>
          </dl>
          <h3>Pitch</h3>
          <p>{app.pitch}</p>
          <h3>Proposed deliverables</h3>
          <p>{app.proposedDeliverables || "Not specified"}</p>
          <h3>Additional notes</h3>
          <p>{app.additionalNotes || "None"}</p>
        </article>
        <article className="application-panel">
          <h2>Creator profile</h2>
          <p>{app.creator?.bio}</p>
          <div className="campaign-facts">
            <span>
              {app.creator?.city}, {app.creator?.country}
            </span>
            <span>
              {app.creator?.combinedFollowers.toLocaleString()} combined
              followers
            </span>
            <span>{app.creator?.verificationStatus}</span>
          </div>
          <h3>Categories</h3>
          <p>{app.creator?.categories.map((x) => x.name).join(" · ")}</p>
          <h3>Social accounts</h3>
          {app.creator?.socialAccounts.map((x) => (
            <p key={x.id}>
              <strong>{statusLabel(x.platform)}</strong> ·{" "}
              {x.followers.toLocaleString()} followers
            </p>
          ))}
          <h3>Portfolio</h3>
          {app.creator?.portfolio.map((x) => (
            <p key={x.id}>{x.title}</p>
          ))}
          <Link href={`/creators/${app.creator?.slug}`}>
            View marketplace profile →
          </Link>
          <p className="privacy-note">
            Creator login email and private phone details are never included.
          </p>
        </article>
      </div>
    </main>
  );
}
