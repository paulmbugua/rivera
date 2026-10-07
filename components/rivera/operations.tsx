"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { statusLabel } from "@/lib/applications";

type Preference = {
  category: string;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  pushEnabled: boolean;
  critical: boolean;
};
const errorText = (error: unknown) =>
  error instanceof ApiError
    ? error.message
    : "Unable to complete that request.";

export function OperationalSettings() {
  const [items, setItems] = useState<Preference[]>([]),
    [message, setMessage] = useState("");
  useEffect(() => {
    api<Preference[]>("/settings/notification-preferences")
      .then(setItems)
      .catch((error) => setMessage(errorText(error)));
  }, []);
  async function update(
    item: Preference,
    field: "emailEnabled" | "inAppEnabled" | "pushEnabled",
  ) {
    const next = { ...item, [field]: !item[field] };
    setItems((current) =>
      current.map((x) => (x.category === item.category ? next : x)),
    );
    try {
      await api("/settings/notification-preferences", {
        method: "PATCH",
        body: JSON.stringify(next),
      });
      setMessage("Notification preferences saved.");
    } catch (error) {
      setItems((current) =>
        current.map((x) => (x.category === item.category ? item : x)),
      );
      setMessage(errorText(error));
    }
  }
  async function request(type: "EXPORT" | "DELETION") {
    if (
      type === "DELETION" &&
      !window.confirm(
        "Request account deletion review? Financial and audit records may need to be retained.",
      )
    )
      return;
    try {
      await api("/settings/data-requests", {
        method: "POST",
        body: JSON.stringify({ type }),
      });
      setMessage(`${statusLabel(type)} request submitted for review.`);
    } catch (error) {
      setMessage(errorText(error));
    }
  }
  return (
    <>
      <section>
        <h2>Notification preferences</h2>
        <p>
          Security and payment notices remain enabled. Marketing is controlled
          separately.
        </p>
        <div className="application-list">
          {items.map((item) => (
            <article className="application-card" key={item.category}>
              <div>
                <strong>{statusLabel(item.category)}</strong>
                {item.critical && <p>Required operational notice</p>}
              </div>
              <label>
                <input
                  type="checkbox"
                  checked={item.inAppEnabled}
                  disabled={item.critical}
                  onChange={() => void update(item, "inAppEnabled")}
                />{" "}
                In-app
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={item.emailEnabled}
                  disabled={item.critical}
                  onChange={() => void update(item, "emailEnabled")}
                />{" "}
                Email
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={item.pushEnabled}
                  disabled={item.critical}
                  onChange={() => void update(item, "pushEnabled")}
                />{" "}
                Push
              </label>
            </article>
          ))}
        </div>
      </section>
      <section>
        <h2>Your Rivera data</h2>
        <p>
          Submit a reviewed export or deletion request. Required financial,
          fraud-prevention and audit records are retained according to policy.
        </p>
        <div className="dashboard-actions">
          <button
            className="button secondary"
            onClick={() => void request("EXPORT")}
          >
            Request data export
          </button>
          <button
            className="button secondary"
            onClick={() => void request("DELETION")}
          >
            Request account deletion
          </button>
        </div>
        {message && <p role="status">{message}</p>}
      </section>
    </>
  );
}

type AdminKind = "reports" | "analytics" | "support" | "data-requests";
export function AdminOperations({ kind }: { kind: AdminKind }) {
  const [data, setData] = useState<unknown>(null),
    [query, setQuery] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    if (kind === "support") return;
    api<unknown>(`/admin/${kind}`)
      .then(setData)
      .catch((e) => setError(errorText(e)));
  }, [kind]);
  async function search() {
    try {
      setData(
        await api(`/admin/support/search?q=${encodeURIComponent(query)}`),
      );
    } catch (e) {
      setError(errorText(e));
    }
  }
  return (
    <main className="application-shell">
      <header>
        <Link href="/admin">← Administration</Link>
        <p className="eyebrow">OPERATIONS</p>
        <h1>{statusLabel(kind)}</h1>
      </header>
      {kind === "support" && (
        <section className="application-panel">
          <label className="field">
            <span>User email or Rivera/provider ID</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <button className="button primary" onClick={() => void search()}>
            Search
          </button>
        </section>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <pre
        className="application-panel"
        style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
      >
        {data
          ? JSON.stringify(data, null, 2)
          : "No operational records loaded."}
      </pre>
    </main>
  );
}
