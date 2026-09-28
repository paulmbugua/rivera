"use client";
/* eslint-disable react-hooks/exhaustive-deps */
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import {
  ApplicationResult,
  majorToMinor,
  money,
  statusLabel,
} from "@/lib/applications";
import { AdminShell } from "./admin-phase3";
const message = (e: unknown) =>
  e instanceof ApiError ? e.message : "Please try again.";
type FeeRule = {
  id: string;
  name: string;
  countryCode?: string;
  categoryId?: string;
  amountMinor: number;
  currencyCode: string;
  priority: number;
  active: boolean;
  category?: { name: string };
};
type Payment = {
  id: string;
  amountMinor: number;
  currencyCode: string;
  status: string;
  paidAt?: string;
  refundedAt?: string;
  providerPaymentId?: string;
  application: {
    id: string;
    status: string;
    campaign: { id: string; title: string; business: { name: string } };
    creator: { displayName: string };
  };
};
export function AdminApplications() {
  const [result, setResult] = useState<ApplicationResult | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    api<ApplicationResult>("/admin/applications")
      .then(setResult)
      .catch((e) => setError(message(e)));
  }, []);
  return (
    <AdminShell title="Marketplace applications">
      {error && <p className="form-error">{error}</p>}
      <div className="manage-list">
        {result?.items.map((app) => (
          <article key={app.id}>
            <div>
              <strong>
                {app.creator?.displayName} → {app.campaign.title}
              </strong>
              <p>
                {statusLabel(app.status)} · {statusLabel(app.paymentStatus)} ·{" "}
                {money(app.proposedAmountMinor, app.proposedCurrencyCode)}
              </p>
            </div>
          </article>
        ))}
      </div>
    </AdminShell>
  );
}
export function AdminFees() {
  const [rules, setRules] = useState<FeeRule[]>([]),
    [error, setError] = useState(""),
    [form, setForm] = useState({
      name: "",
      countryCode: "",
      amount: "3",
      currencyCode: "USD",
      priority: "0",
    });
  const load = () =>
    api<FeeRule[]>("/admin/application-fees")
      .then(setRules)
      .catch((e) => setError(message(e)));
  useEffect(() => {
    void load();
  }, []);
  async function create(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api("/admin/application-fees", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          countryCode: form.countryCode || undefined,
          amountMinor: majorToMinor(Number(form.amount), form.currencyCode),
          currencyCode: form.currencyCode,
          priority: Number(form.priority),
          active: true,
        }),
      });
      setForm({ ...form, name: "" });
      load();
    } catch (e) {
      setError(message(e));
    }
  }
  async function toggle(rule: FeeRule) {
    try {
      await api(`/admin/application-fees/${rule.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: rule.name,
          countryCode: rule.countryCode || undefined,
          categoryId: rule.categoryId || undefined,
          amountMinor: rule.amountMinor,
          currencyCode: rule.currencyCode,
          priority: rule.priority,
          active: !rule.active,
        }),
      });
      load();
    } catch (e) {
      setError(message(e));
    }
  }
  return (
    <AdminShell title="Application Fee rules">
      <p>
        Specific country/category rules override the global default. Existing
        payment snapshots do not change.
      </p>
      <form className="inline-form admin-fee-form" onSubmit={create}>
        <label className="field">
          Rule name
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
        <label className="field">
          Country code
          <input
            maxLength={2}
            value={form.countryCode}
            onChange={(e) =>
              setForm({ ...form, countryCode: e.target.value.toUpperCase() })
            }
          />
        </label>
        <label className="field">
          Amount
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
        </label>
        <label className="field">
          Currency
          <input
            maxLength={3}
            value={form.currencyCode}
            onChange={(e) =>
              setForm({ ...form, currencyCode: e.target.value.toUpperCase() })
            }
          />
        </label>
        <label className="field">
          Priority
          <input
            type="number"
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value })}
          />
        </label>
        <button className="button primary">Create rule</button>
      </form>
      {error && <p className="form-error">{error}</p>}
      <div className="manage-list">
        {rules.map((rule) => (
          <article key={rule.id}>
            <div>
              <strong>{rule.name}</strong>
              <p>
                {money(rule.amountMinor, rule.currencyCode)} ·{" "}
                {rule.countryCode || "Global"}
                {rule.category ? ` · ${rule.category.name}` : ""} · priority{" "}
                {rule.priority} · {rule.active ? "Active" : "Inactive"}
              </p>
            </div>
            <button onClick={() => void toggle(rule)}>
              {rule.active ? "Deactivate" : "Activate"}
            </button>
          </article>
        ))}
      </div>
    </AdminShell>
  );
}
export function AdminPayments() {
  const [items, setItems] = useState<Payment[]>([]),
    [error, setError] = useState("");
  useEffect(() => {
    api<Payment[]>("/admin/payments")
      .then(setItems)
      .catch((e) => setError(message(e)));
  }, []);
  return (
    <AdminShell title="Application Fee payments">
      {error && <p className="form-error">{error}</p>}
      <div className="manage-list">
        {items.map((p) => (
          <article key={p.id}>
            <div>
              <strong>
                {p.application.creator.displayName} ·{" "}
                {p.application.campaign.title}
              </strong>
              <p>
                {money(p.amountMinor, p.currencyCode)} · {statusLabel(p.status)}{" "}
                · {p.providerPaymentId || "Provider reference pending"}
              </p>
            </div>
            <Link href={`/admin/payments/${p.id}`}>Inspect</Link>
          </article>
        ))}
      </div>
    </AdminShell>
  );
}
export function AdminPaymentDetail({ id }: { id: string }) {
  const [payment, setPayment] = useState<
      | (Payment & {
          refunds: { id: string; status: string; reason: string }[];
          webhookEvents: { id: string; eventType: string; status: string }[];
        })
      | null
    >(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const load = () =>
    api<typeof payment>(`/admin/payments/${id}`)
      .then(setPayment)
      .catch((e) => setError(message(e)));
  useEffect(() => {
    void load();
  }, [id]);
  async function refund() {
    if (!confirm("Issue a full refund through Stripe?")) return;
    setBusy(true);
    try {
      await api(`/admin/payments/${id}/refund`, {
        method: "POST",
        body: JSON.stringify({
          reason: "OTHER",
          note: "Administrator-approved Rivera Application Fee refund.",
        }),
      });
      load();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <AdminShell title="Payment inspection">
      {error && <p className="form-error">{error}</p>}
      {payment && (
        <>
          <section className="profile-panel">
            <p className="eyebrow">{statusLabel(payment.status)}</p>
            <h2>{money(payment.amountMinor, payment.currencyCode)}</h2>
            <p>
              {payment.application.creator.displayName} ·{" "}
              {payment.application.campaign.title}
            </p>
            <p>Reference: {payment.providerPaymentId || "Pending"}</p>
            {payment.status === "PAID" && !payment.refundedAt && (
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => void refund()}
              >
                {busy ? "Requesting refund…" : "Refund full Application Fee"}
              </button>
            )}
          </section>
          <section className="profile-panel">
            <h2>Webhook processing</h2>
            {payment.webhookEvents.map((e) => (
              <p key={e.id}>
                {e.eventType} · {e.status}
              </p>
            ))}
            <h2>Refund history</h2>
            {payment.refunds.length ? (
              payment.refunds.map((r) => (
                <p key={r.id}>
                  {r.reason} · {r.status}
                </p>
              ))
            ) : (
              <p>No refunds.</p>
            )}
          </section>
        </>
      )}
    </AdminShell>
  );
}
