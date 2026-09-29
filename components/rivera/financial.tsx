"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { money, statusLabel } from "@/lib/applications";

type Payment = {
  id?: string;
  campaignParticipantId: string;
  grossAmountMinor: number;
  platformFeeMinor: number;
  creatorNetMinor: number;
  fundedAmountMinor: number;
  refundedAmountMinor: number;
  releasedAmountMinor: number;
  currencyCode: string;
  status: string;
  participantStatus?: string;
  fundingDueAt?: string;
  fundedAt?: string;
  campaign: { title: string; slug?: string };
  creator?: { displayName: string };
  business?: { name: string };
  transfers?: { id: string; status: string; amountMinor: number }[];
  refunds?: { id: string; status: string; amountMinor: number }[];
};
type PayoutAccount = {
  onboardingStatus: string;
  payoutsEnabled: boolean;
};
type Transfer = {
  id: string;
  status: string;
  amountMinor: number;
  currencyCode: string;
  collaborationPayment: { campaign: { title: string } };
};
type AdminRecord = {
  id: string;
  status?: string;
  onboardingStatus?: string;
  currencyCode?: string;
  amountMinor?: number;
  providerAccountId?: string;
  description?: string;
  campaign?: { title?: string };
  creator?: { displayName?: string };
  campaignParticipant?: { campaign?: { title?: string } };
};
type CurrencyTotal = {
  currencyCode: string;
  fundedMinor: number;
  releasedMinor: number;
};
type AdminResponse = { items: AdminRecord[]; totals?: CurrencyTotal[] };
const errorText = (e: unknown) =>
  e instanceof ApiError ? e.message : "Something went wrong.";

export function BusinessPayments() {
  const [items, setItems] = useState<Payment[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState("");
  const load = () =>
    api<Payment[]>("/business/collaboration-payments")
      .then(setItems)
      .catch((e) => setError(errorText(e)));
  useEffect(() => {
    void load();
  }, []);
  async function action(item: Payment, kind: "fund" | "release") {
    if (
      !window.confirm(
        kind === "fund"
          ? `Fund this collaboration for ${money(item.grossAmountMinor, item.currencyCode)}?`
          : `Release ${money(item.creatorNetMinor, item.currencyCode)} to the Creator?`,
      )
    )
      return;
    setBusy(item.campaignParticipantId);
    setError("");
    try {
      if (kind === "fund") {
        const x = await api<{ checkoutUrl?: string }>(
          `/business/campaign-participants/${item.campaignParticipantId}/payment`,
          { method: "POST" },
        );
        if (x.checkoutUrl) {
          window.location.assign(x.checkoutUrl);
          return;
        }
      } else
        await api(`/business/collaboration-payments/${item.id}/release`, {
          method: "POST",
        });
      await load();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy("");
    }
  }
  return (
    <FinancialShell title="Collaboration payments" back="/dashboard/business">
      <p>
        Fund accepted Creator compensation, then release it only after approved
        completion.
      </p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="application-list">
        {items.map((x) => (
          <article className="application-card" key={x.campaignParticipantId}>
            <div>
              <p className="eyebrow">{statusLabel(x.status)}</p>
              <h2>{x.campaign.title}</h2>
              <p>{x.creator?.displayName}</p>
              {x.fundingDueAt && <p>Funding deadline: {new Date(x.fundingDueAt).toLocaleString()}</p>}
              {x.status === "FAILED" && <p className="form-error">The last funding attempt failed. This collaboration is still inactive; try again.</p>}
              <dl>
                <dt>Creator compensation</dt>
                <dd>{money(x.creatorNetMinor, x.currencyCode)}</dd>
                <dt>Rivera fee</dt>
                <dd>{money(x.platformFeeMinor, x.currencyCode)}</dd>
                <dt>Total Business payment</dt>
                <dd>{money(x.grossAmountMinor, x.currencyCode)}</dd>
                <dt>Released</dt>
                <dd>{money(x.releasedAmountMinor, x.currencyCode)}</dd>
              </dl>
            </div>
            <div className="dashboard-actions">
              {["NOT_FUNDED", "FAILED"].includes(x.status) && (
                <button
                  className="button primary"
                  disabled={!!busy}
                  onClick={() => void action(x, "fund")}
                >
                  Fund collaboration
                </button>
              )}
              {x.status === "FUNDED" && x.id && (
                <button
                  className="button primary"
                  disabled={!!busy}
                  onClick={() => void action(x, "release")}
                >
                  Release Creator payment
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </FinancialShell>
  );
}

export function CreatorEarnings({ payouts = false }: { payouts?: boolean }) {
  const [items, setItems] = useState<Payment[]>([]),
    [account, setAccount] = useState<PayoutAccount>(),
    [transfers, setTransfers] = useState<Transfer[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    void Promise.all([
      api<Payment[]>("/creators/me/earnings"),
      api<PayoutAccount>("/creators/me/payout-account"),
      api<Transfer[]>("/creators/me/transfers"),
    ])
      .then(([a, b, c]) => {
        setItems(a);
        setAccount(b);
        setTransfers(c);
      })
      .catch((e) => setError(errorText(e)));
  }, []);
  async function onboard() {
    setBusy(true);
    try {
      const x = await api<{ url: string }>(
        "/creators/me/payout-account/onboard",
        { method: "POST" },
      );
      window.location.assign(x.url);
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  }
  return (
    <FinancialShell
      title={payouts ? "Payout account" : "Creator earnings"}
      back="/dashboard/creator"
    >
      <section className="application-panel">
        <p className="eyebrow">PAYOUT READINESS</p>
        <h2>{statusLabel(account?.onboardingStatus ?? "NOT_STARTED")}</h2>
        <p>
          {account?.payoutsEnabled
            ? "Your provider account can receive Rivera transfers."
            : "Complete provider-hosted onboarding before Rivera can release funds."}
        </p>
        {!account?.payoutsEnabled && (
          <button
            className="button primary"
            disabled={busy}
            onClick={() => void onboard()}
          >
            {account?.onboardingStatus === "NOT_STARTED"
              ? "Set up payouts"
              : "Continue payout setup"}
          </button>
        )}
      </section>
      {error && <p className="form-error">{error}</p>}
      {!payouts && (
        <div className="application-list">
          {items.map((x) => (
            <article className="application-card" key={x.campaignParticipantId}>
              <div>
                <p className="eyebrow">{statusLabel(x.status)}</p>
                <h2>{x.campaign.title}</h2>
                <p>{x.business?.name}</p>
                <p>
                  {money(x.creatorNetMinor, x.currencyCode)} compensation ·{" "}
                  {money(x.releasedAmountMinor, x.currencyCode)} released
                </p>
                {x.status === "FUNDED" && <p>Funded by the Business and held for approved completion. This is not yet money received.</p>}
              </div>
            </article>
          ))}
        </div>
      )}
      {payouts && (
        <div className="application-list">
          {transfers.map((x) => (
            <article className="application-card" key={x.id}>
              <div>
                <p className="eyebrow">{statusLabel(x.status)}</p>
                <h2>{x.collaborationPayment.campaign.title}</h2>
                <p>{money(x.amountMinor, x.currencyCode)}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </FinancialShell>
  );
}

export function AdminFinance({
  kind,
}: {
  kind:
    | "collaboration-payments"
    | "transfers"
    | "refunds"
    | "payment-issues"
    | "payout-accounts";
}) {
  const [data, setData] = useState<AdminResponse | AdminRecord[] | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    api<AdminResponse | AdminRecord[]>(`/admin/${kind}`)
      .then(setData)
      .catch((e) => setError(errorText(e)));
  }, [kind]);
  const items = Array.isArray(data) ? data : (data?.items ?? []),
    totals = Array.isArray(data) ? undefined : data?.totals;
  return (
    <FinancialShell title={statusLabel(kind)} back="/admin">
      <p>
        Provider-backed financial records are read-only except for audited
        reconciliation, issue resolution and permitted refunds.
      </p>
      {error && <p className="form-error">{error}</p>}
      {totals && (
        <div className="dashboard-stats">
          {totals.map((x) => (
            <article key={x.currencyCode}>
              <strong>{money(x.fundedMinor, x.currencyCode)}</strong>
              <span>
                Funded · {money(x.releasedMinor, x.currencyCode)} released
              </span>
            </article>
          ))}
        </div>
      )}
      <div className="application-list">
        {items.map((x) => (
          <article className="application-card" key={x.id}>
            <div>
              <p className="eyebrow">
                {statusLabel(x.status ?? x.onboardingStatus ?? "UNKNOWN")}
              </p>
              <h2>
                {x.campaign?.title ??
                  x.creator?.displayName ??
                  x.campaignParticipant?.campaign?.title ??
                  "Financial record"}
              </h2>
              <p>
                {x.currencyCode && typeof x.amountMinor === "number"
                  ? money(x.amountMinor, x.currencyCode)
                  : (x.providerAccountId ?? x.description)}
              </p>
            </div>
          </article>
        ))}
      </div>
    </FinancialShell>
  );
}

function FinancialShell({
  title,
  back,
  children,
}: {
  title: string;
  back: string;
  children: React.ReactNode;
}) {
  return (
    <main className="application-shell">
      <header>
        <Link href={back}>← Dashboard</Link>
        <p className="eyebrow">RIVERA FINANCIAL OPERATIONS</p>
        <h1>{title}</h1>
      </header>
      {children}
    </main>
  );
}
